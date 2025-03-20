// Update player car movement
function updatePlayerCar() {
  if (gameState.finished) return;

  // Previous speed and gear for comparison
  const previousSpeed = gameState.speed;
  const previousGear = gameState.currentGear;

  // Get physics constants
  const maxSpeed = config.carSpeed;
  const baseAcceleration = config.acceleration;
  const deceleration = config.deceleration;
  const brakeForce = config.brakeForce;
  const inertia = config.physics.inertia || 0.92; // Default if not defined
  const grip = config.physics.grip || 0.7; // Default if not defined

  // Track key presses for controls and sound effects
  const isAcceleratorPressed = keysPressed.ArrowUp;
  const isBrakePressed = keysPressed.ArrowDown;
  const isSteeringLeft = keysPressed.ArrowLeft;
  const isSteeringRight = keysPressed.ArrowRight;

  // Handle gear changes
  updateGearChanges();

  // Calculate effective acceleration
  let effectiveAcceleration = 0;

  // Apply acceleration based on input
  if (isAcceleratorPressed && !gameState.isChangingGear) {
    // Base acceleration
    effectiveAcceleration = baseAcceleration;

    // Reduce acceleration in higher gears at low speeds
    if (gameState.currentGear > 2 && gameState.speed < 0.2) {
      effectiveAcceleration *= 0.5;
    }

    // Reduce acceleration at high speeds
    const speedRatio = gameState.speed / maxSpeed;
    if (speedRatio > 0.8) {
      effectiveAcceleration *= 1 - (speedRatio - 0.8) / 0.2;
    }
  }

  // Apply braking
  if (isBrakePressed) {
    if (gameState.speed > 0.01) {
      effectiveAcceleration -= brakeForce;
    } else if (gameState.speed < -0.01) {
      effectiveAcceleration += brakeForce;
    } else {
      // If stopped and brake is pressed, try to engage reverse
      if (gameState.currentGear >= 0 && !gameState.isChangingGear) {
        initiateGearChange(-1);
      }
    }
  }

  // Natural deceleration when no input
  if (!isAcceleratorPressed && !isBrakePressed) {
    if (gameState.speed > 0.01) {
      effectiveAcceleration -= deceleration;
    } else if (gameState.speed < -0.01) {
      effectiveAcceleration += deceleration;
    }
  }

  // Apply acceleration to speed
  gameState.speed += effectiveAcceleration;

  // Apply speed limits based on current gear
  const gearSpeedLimits = {
    "-1": maxSpeed * 0.2, // Reverse
    0: 0, // Neutral
    1: maxSpeed * 0.2, // 1st gear
    2: maxSpeed * 0.4, // 2nd gear
    3: maxSpeed * 0.6, // 3rd gear
    4: maxSpeed * 0.8, // 4th gear
    5: maxSpeed, // 5th gear
  };

  // Get current gear's speed limit
  const currentGearLimit = gearSpeedLimits[gameState.currentGear] || maxSpeed;

  // Apply gear speed limit
  if (gameState.speed > currentGearLimit) {
    gameState.speed = currentGearLimit;
  } else if (gameState.speed < -gearSpeedLimits["-1"]) {
    gameState.speed = -gearSpeedLimits["-1"];
  }

  // Handle steering
  if (isSteeringLeft) {
    // Steering sensitivity decreases with speed
    const steeringFactor =
      0.1 * (1 - Math.min(0.8, Math.abs(gameState.speed) / maxSpeed));
    playerCar.position.x -= steeringFactor;
    playerCar.rotation.y = -0.2;
  } else if (isSteeringRight) {
    const steeringFactor =
      0.1 * (1 - Math.min(0.8, Math.abs(gameState.speed) / maxSpeed));
    playerCar.position.x += steeringFactor;
    playerCar.rotation.y = 0.2;
  } else {
    // Return to straight
    playerCar.rotation.y *= 0.8;
  }

  // Update gear and RPM
  updateGearAndRPM();

  // Update engine sound
  if (typeof updateEngineSound === "function") {
    updateEngineSound(
      gameState.speed,
      maxSpeed,
      isAcceleratorPressed,
      isBrakePressed,
      gameState.rpm
    );
  }

  // Update exhaust particles
  if (typeof updateExhaustParticles === "function") {
    updateExhaustParticles(playerCar, isAcceleratorPressed, gameState.rpm);
  }

  // Move car based on current speed
  playerCar.translateZ(gameState.speed);

  // Update max speed
  if (gameState.speed > gameState.maxSpeed) {
    gameState.maxSpeed = gameState.speed;
  }

  // Start race if not started
  if (!gameState.started && gameState.speed > 0) {
    if (typeof startRace === "function") {
      startRace();
    } else {
      // Fallback if startRace isn't defined
      gameState.started = true;
      gameState.startTime = Date.now();
      console.log("Race started (fallback)!");
    }
  }

  // Check for collisions with AI cars
  if (typeof checkCollisions === "function") {
    checkCollisions(playerCar);
  }

  // Check if player has finished
  if (typeof checkFinish === "function") {
    checkFinish(playerCar, "You");
  }

  // Check track boundaries
  if (typeof checkBoundaries === "function") {
    checkBoundaries(playerCar);
  }

  // Debug output
  console.log(
    `Speed: ${gameState.speed.toFixed(
      4
    )}, Accel: ${effectiveAcceleration.toFixed(4)}, Gear: ${
      gameState.currentGear
    }, RPM: ${gameState.rpm.toFixed(1)}`
  );
}

// Update gear and RPM calculations
function updateGearAndRPM() {
  // Normalized speed (0-1)
  const normalizedSpeed = Math.abs(gameState.speed) / config.carSpeed;

  // Don't change gears if currently in a gear change
  if (gameState.isChangingGear) {
    return;
  }

  // Determine appropriate gear based on speed
  let newGear;

  if (gameState.speed < -0.01) {
    newGear = -1; // Reverse
  } else if (normalizedSpeed < 0.01) {
    newGear = 0; // Neutral
  } else {
    // Forward gears based on speed thresholds
    const thresholds = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

    // Find the appropriate gear based on current speed
    for (let i = 1; i < thresholds.length; i++) {
      if (normalizedSpeed < thresholds[i]) {
        newGear = i;
        break;
      }
    }

    // If we're at max speed, use the highest gear
    if (!newGear && normalizedSpeed >= thresholds[thresholds.length - 1]) {
      newGear = thresholds.length - 1;
    }

    // Don't shift down too quickly - prevent gear hunting
    if (
      newGear < gameState.currentGear &&
      normalizedSpeed > thresholds[newGear] * 0.8
    ) {
      newGear = gameState.currentGear;
    }
  }

  // If gear needs to change, initiate gear change
  if (newGear !== gameState.currentGear) {
    initiateGearChange(newGear);
  }

  // Calculate RPM based on speed within current gear range
  calculateRPM();
}

// Calculate RPM based on current speed and gear
function calculateRPM() {
  const normalizedSpeed = Math.abs(gameState.speed) / config.carSpeed;

  if (gameState.currentGear === -1) {
    // Reverse gear - RPM proportional to speed
    gameState.rpm = (normalizedSpeed / 0.2) * 80; // Reverse limited to 20% of max speed
  } else if (gameState.currentGear === 0) {
    // Neutral - RPM based on accelerator input
    gameState.rpm = keysPressed.ArrowUp ? 20 : 10;
  } else if (gameState.currentGear > 0) {
    // Forward gears
    const gearMin = 0.2 * (gameState.currentGear - 1);
    const gearMax = 0.2 * gameState.currentGear;
    const gearRange = gearMax - gearMin;

    // Where in this gear's range is our current speed?
    const gearPosition = (normalizedSpeed - gearMin) / gearRange;

    // RPM curve - rises through the gear, peaks at about 90% of the gear's range
    if (gearPosition < 0.9) {
      gameState.rpm = 20 + (gearPosition / 0.9) * 80;
    } else {
      gameState.rpm = 100;
    }

    // Add RPM variation based on acceleration
    if (keysPressed.ArrowUp) {
      gameState.rpm = Math.min(100, gameState.rpm + 10);
    }
  }

  // Ensure RPM is within bounds
  gameState.rpm = Math.max(0, Math.min(100, gameState.rpm));
}

// Initiate a gear change
function initiateGearChange(targetGear) {
  // Don't change if already changing or same gear
  if (gameState.isChangingGear || targetGear === gameState.currentGear) {
    return;
  }

  // Start gear change
  gameState.isChangingGear = true;
  gameState.targetGear = targetGear;
  gameState.gearChangeStart = Date.now();

  // Play gear shift sound
  if (typeof playSound === "function") {
    playSound("gear_shift", { volume: 0.3 });
  }

  console.log(`Changing gear from ${gameState.currentGear} to ${targetGear}`);
}

// Update gear changes in progress
function updateGearChanges() {
  if (!gameState.isChangingGear) {
    return;
  }

  // Calculate how far through the gear change we are
  const changeTime =
    config.gears && config.gears.changeTime ? config.gears.changeTime : 500;
  const elapsed = Date.now() - gameState.gearChangeStart;

  // If gear change is complete
  if (elapsed >= changeTime) {
    gameState.currentGear = gameState.targetGear;
    gameState.isChangingGear = false;
    console.log(`Gear change complete: now in gear ${gameState.currentGear}`);
  }
}

// Update camera to follow player car
function updateCamera() {
  // Target position behind the car
  const cameraOffset = new THREE.Vector3();
  cameraOffset.set(0, 10, -15); // Height and distance behind
  cameraOffset.applyQuaternion(playerCar.quaternion);
  cameraOffset.add(playerCar.position);

  // Smoothly move camera to target position
  camera.position.lerp(cameraOffset, 0.1);

  // Look at a point ahead of the car
  const lookAtOffset = new THREE.Vector3();
  lookAtOffset.set(0, 0, 10); // Look ahead of the car
  lookAtOffset.applyQuaternion(playerCar.quaternion);
  lookAtOffset.add(playerCar.position);

  camera.lookAt(lookAtOffset);
}
