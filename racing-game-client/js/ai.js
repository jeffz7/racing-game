// Update AI cars
function updateAICars() {
  if (!gameState.started) return;

  // Update each AI car
  aiCars.forEach((car, index) => {
    // Get AI car state from userData
    if (!car.userData.aiState) {
      // Initialize AI state if not exists
      car.userData.aiState = {
        speed: 0,
        maxSpeed: 0,
        acceleration: 0,
        currentGear: 0,
        targetGear: 0,
        isChangingGear: false,
        gearChangeStart: 0,
        rpm: 0,
        wheelspin: 0,
        lastGearChangeTime: 0,
      };
    }

    const aiState = car.userData.aiState;

    // Previous values for comparison
    const previousSpeed = aiState.speed;
    const previousGear = aiState.currentGear;

    // Get physics constants (same as player)
    const maxSpeed = config.carSpeed * (0.9 + index * 0.05); // Slight variation between AI cars
    const baseAcceleration = config.acceleration * (0.85 + index * 0.05); // Slight variation
    const deceleration = config.deceleration;
    const brakeForce = config.brakeForce;
    const inertia = config.physics.inertia;
    const grip = config.physics.grip;

    // AI decision making - determine if accelerating, braking, or steering
    const isAccelerating = Math.random() < 0.95; // 95% chance to accelerate
    const isBraking = Math.random() < 0.05; // 5% chance to brake

    // Random steering with some persistence
    let steeringDirection = car.userData.steeringDirection || 0;
    if (Math.random() < 0.02) {
      // 2% chance to change steering direction
      steeringDirection = Math.random() - 0.5;
      car.userData.steeringDirection = steeringDirection;
    }

    // Handle AI gear changes
    updateAIGearChanges(car, aiState);

    // Calculate effective acceleration based on current gear
    let effectiveAcceleration = 0;

    // Get gear efficiency and speed limit
    const gearEfficiency =
      config.physics.gearEfficiency[aiState.currentGear] || 1;
    const gearSpeedLimit =
      (config.physics.speedLimits[aiState.currentGear] || 1) * maxSpeed;

    // Calculate acceleration based on gear and throttle
    if (isAccelerating && !aiState.isChangingGear) {
      // Base acceleration modified by gear efficiency
      effectiveAcceleration = baseAcceleration * gearEfficiency;

      // Reduce acceleration as we approach gear's speed limit
      const speedRatio = Math.abs(aiState.speed) / gearSpeedLimit;
      if (speedRatio > 0.8) {
        // Exponential dropoff in acceleration as we approach gear limit
        effectiveAcceleration *= Math.pow(1 - (speedRatio - 0.8) / 0.2, 2);
      }

      // Add some wheelspin effect at low speeds with high acceleration
      if (aiState.speed < 0.1 && aiState.currentGear > 0) {
        aiState.wheelspin = Math.min(aiState.wheelspin + 0.05, 1);

        // Reduce effective acceleration during wheelspin
        effectiveAcceleration *= 1 - aiState.wheelspin * 0.7;
      } else {
        // Gradually reduce wheelspin
        aiState.wheelspin = Math.max(aiState.wheelspin - 0.1, 0);
      }
    } else {
      // Gradually reduce wheelspin when not accelerating
      aiState.wheelspin = Math.max(aiState.wheelspin - 0.1, 0);
    }

    // Apply braking force
    if (isBraking) {
      // Stronger braking at higher speeds
      const brakingForce =
        brakeForce * (0.5 + (Math.abs(aiState.speed) / maxSpeed) * 0.5);

      if (aiState.speed > 0.01) {
        // Braking when moving forward
        effectiveAcceleration -= brakingForce;
      } else if (aiState.speed < -0.01) {
        // Braking when moving backward
        effectiveAcceleration += brakingForce;
      }
    }

    // Apply natural deceleration (engine braking, friction)
    if (!isAccelerating && !isBraking) {
      // More engine braking in lower gears
      const engineBraking =
        deceleration * (1 + (5 - aiState.currentGear) * 0.1);

      if (aiState.speed > 0.01) {
        effectiveAcceleration -= engineBraking;
      } else if (aiState.speed < -0.01) {
        effectiveAcceleration += engineBraking;
      }
    }

    // Update acceleration
    aiState.acceleration = effectiveAcceleration;

    // Apply acceleration to speed with inertia
    const targetSpeed = aiState.speed + aiState.acceleration;

    // Apply inertia - car doesn't instantly reach target speed
    aiState.speed = aiState.speed * inertia + targetSpeed * (1 - inertia);

    // Enforce gear speed limits
    if (Math.abs(aiState.speed) > gearSpeedLimit) {
      // Gradually reduce speed if over the gear's limit
      aiState.speed =
        aiState.speed > 0
          ? Math.max(aiState.speed * 0.98, gearSpeedLimit)
          : Math.min(aiState.speed * 0.98, -gearSpeedLimit);
    }

    // Handle steering with realistic physics
    updateAISteering(car, steeringDirection, grip, aiState.speed, maxSpeed);

    // Calculate current gear and RPM
    updateAIGearAndRPM(car, aiState, maxSpeed);

    // Update exhaust particles if the function exists
    if (typeof updateExhaustParticles === "function") {
      updateExhaustParticles(car, isAccelerating, aiState.rpm);
    }

    // Move car based on current speed
    car.translateZ(aiState.speed);

    // Update max speed
    if (aiState.speed > aiState.maxSpeed) {
      aiState.maxSpeed = aiState.speed;
    }

    // Check for collisions with other cars
    checkAICollisions(car, index);

    // Check if AI car has finished
    checkFinish(car, car.userData.name || `AI Car ${index + 1}`);

    // Check track boundaries
    checkAIBoundaries(car);
  });
}

// Handle AI gear changes
function updateAIGearChanges(car, aiState) {
  if (aiState.isChangingGear) {
    // Calculate how far through the gear change we are
    const changeTime = 500; // 500ms for gear change
    const elapsed = Date.now() - aiState.gearChangeStart;

    // If gear change is complete
    if (elapsed >= changeTime) {
      aiState.currentGear = aiState.targetGear;
      aiState.isChangingGear = false;
    }
    return;
  }

  // Don't change gears too frequently
  if (Date.now() - aiState.lastGearChangeTime < 2000) {
    return;
  }

  // Determine appropriate gear based on speed
  const normalizedSpeed = Math.abs(aiState.speed) / config.carSpeed;

  let newGear;
  if (aiState.speed < -0.01) {
    newGear = -1; // Reverse
  } else if (normalizedSpeed < 0.01) {
    newGear = 0; // Neutral
  } else if (normalizedSpeed < 0.2) {
    newGear = 1;
  } else if (normalizedSpeed < 0.4) {
    newGear = 2;
  } else if (normalizedSpeed < 0.6) {
    newGear = 3;
  } else if (normalizedSpeed < 0.8) {
    newGear = 4;
  } else {
    newGear = 5;
  }

  // If gear needs to change, initiate gear change
  if (newGear !== aiState.currentGear) {
    aiState.isChangingGear = true;
    aiState.targetGear = newGear;
    aiState.gearChangeStart = Date.now();
    aiState.lastGearChangeTime = Date.now();
  }
}

// Update AI steering
function updateAISteering(car, steeringDirection, grip, speed, maxSpeed) {
  // Base steering factor - lower at higher speeds
  const maxSteeringAngle = 0.05;
  const speedFactor = 1 - Math.min(1, (Math.abs(speed) / maxSpeed) * 0.8);
  const baseSteering = maxSteeringAngle * speedFactor;

  // Current steering target
  const steeringTarget = steeringDirection * baseSteering;

  // Gradually approach steering target (simulates steering wheel turning)
  const steeringSpeed = 0.1;
  car.userData.steering =
    (car.userData.steering || 0) * (1 - steeringSpeed) +
    steeringTarget * steeringSpeed;

  // Apply steering to car position
  const steeringPower = Math.abs(speed) * car.userData.steering;
  car.position.x += steeringPower;

  // Apply visual rotation to car model
  const targetRotation = car.userData.steering * 10; // Convert steering to rotation

  // Smoothly rotate car model
  const currentRotation = car.rotation.y;
  car.rotation.y = currentRotation * 0.8 + targetRotation * 0.2;

  // Keep AI cars within track boundaries
  const trackHalfWidth = config.trackWidth / 2 - 2; // Leave some margin
  if (car.position.x < -trackHalfWidth) {
    car.position.x = -trackHalfWidth;
    car.userData.steeringDirection = Math.abs(
      car.userData.steeringDirection || 0
    ); // Steer right
  } else if (car.position.x > trackHalfWidth) {
    car.position.x = trackHalfWidth;
    car.userData.steeringDirection = -Math.abs(
      car.userData.steeringDirection || 0
    ); // Steer left
  }
}

// Calculate AI RPM based on current speed and gear
function updateAIGearAndRPM(car, aiState, maxSpeed) {
  const normalizedSpeed = Math.abs(aiState.speed) / maxSpeed;

  if (aiState.currentGear === -1) {
    // Reverse gear - RPM proportional to speed
    aiState.rpm = (normalizedSpeed / 0.2) * 80; // Reverse limited to 20% of max speed
  } else if (aiState.currentGear === 0) {
    // Neutral - idle RPM
    aiState.rpm = 10;
  } else if (aiState.currentGear > 0) {
    // Forward gears
    const gearMin = 0.2 * (aiState.currentGear - 1);
    const gearMax = 0.2 * aiState.currentGear;
    const gearRange = gearMax - gearMin;

    // Where in this gear's range is our current speed?
    const gearPosition = Math.max(0, (normalizedSpeed - gearMin) / gearRange);

    // RPM curve - rises through the gear, peaks at about 90% of the gear's range
    if (gearPosition < 0.9) {
      aiState.rpm = 20 + (gearPosition / 0.9) * 80;
    } else {
      aiState.rpm = 100;
    }
  }

  // Ensure RPM is within bounds
  aiState.rpm = Math.max(0, Math.min(100, aiState.rpm));
}

// Check for collisions between AI cars
function checkAICollisions(car, index) {
  // Check collisions with player
  const playerDistance = car.position.distanceTo(playerCar.position);
  if (playerDistance < config.carWidth) {
    // Collision with player - slow down
    car.userData.aiState.speed *= config.collisionForce;
  }

  // Check collisions with other AI cars
  aiCars.forEach((otherCar, otherIndex) => {
    if (index === otherIndex) return; // Skip self

    const distance = car.position.distanceTo(otherCar.position);
    if (distance < config.carWidth) {
      // Collision with another AI car - slow down
      car.userData.aiState.speed *= config.collisionForce;
    }
  });
}

// Keep AI cars within track boundaries
function checkAIBoundaries(car) {
  const trackHalfWidth = config.trackWidth / 2;

  if (car.position.x < -trackHalfWidth) {
    car.position.x = -trackHalfWidth;
    car.userData.steeringDirection = 0.5; // Steer right
  } else if (car.position.x > trackHalfWidth) {
    car.position.x = trackHalfWidth;
    car.userData.steeringDirection = -0.5; // Steer left
  }
}

// Initialize AI cars with different colors
function initAICars() {
  // Clear existing AI cars array
  window.aiCars = [];

  // Get a reference to the global aiCars array
  const aiCars = window.aiCars;

  // Different colors for each AI car
  const aiColors = [
    0xff0000, // Red
    0x00ff00, // Green
    0xffff00, // Yellow
    0xff00ff, // Magenta
  ];

  // AI car names
  const aiNames = ["SPEEDY", "RACER", "ZOOM", "FLASH"];

  // Calculate lane width for 3 cars side by side
  const laneWidth = config.trackWidth / 3;

  // Create grid positions for all cars (5 positions: 3 front, 2 back)
  const gridPositions = [
    { x: -laneWidth, z: 0 }, // Front left
    { x: 0, z: 0 }, // Front center
    { x: laneWidth, z: 0 }, // Front right
    { x: -laneWidth / 2, z: -6 }, // Back left
    { x: laneWidth / 2, z: -6 }, // Back right
  ];

  // Shuffle grid positions randomly
  for (let i = gridPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gridPositions[i], gridPositions[j]] = [gridPositions[j], gridPositions[i]];
  }

  // Assign player to first position in shuffled array
  const playerPosition = gridPositions.shift();
  playerCar.position.set(playerPosition.x, 0, playerPosition.z);
  console.log(
    `Positioned player car at (${playerPosition.x}, 0, ${playerPosition.z})`
  );

  // Create AI cars in remaining positions
  for (let i = 0; i < config.aiCars; i++) {
    // Use different color for each AI car
    const color = aiColors[i % aiColors.length];
    const name = aiNames[i % aiNames.length];

    const aiCar = createCar(color, name);

    // Get next position from shuffled array
    const position = gridPositions[i];
    aiCar.position.set(position.x, 0, position.z);

    scene.add(aiCar);
    aiCars.push(aiCar);

    // Add name and color to car for leaderboard
    aiCar.userData.name = name;
    aiCar.userData.color = color;

    // Initialize AI state
    aiCar.userData.aiState = {
      speed: 0,
      maxSpeed: 0,
      acceleration: 0,
      currentGear: 0,
      targetGear: 0,
      isChangingGear: false,
      gearChangeStart: 0,
      rpm: 0,
      wheelspin: 0,
      lastGearChangeTime: 0,
    };

    // Random initial steering direction
    aiCar.userData.steeringDirection = (Math.random() - 0.5) * 0.2;
    aiCar.userData.steering = 0;

    console.log(
      `Created AI car ${name} at position (${position.x}, 0, ${
        position.z
      }) with color 0x${color.toString(16)}`
    );
  }

  console.log(
    `Created ${aiCars.length} AI cars with different colors and names in random positions`
  );
}
