// Check for collisions between cars
function checkCollisions(car) {
  // Get all cars to check against
  const allCars = [playerCar, ...aiCars];

  // Don't check against self
  const otherCars = allCars.filter((otherCar) => otherCar !== car);

  // Car dimensions for collision box
  const carWidth = config.carWidth;
  const carLength = config.carLength;

  // Check each other car
  for (const otherCar of otherCars) {
    // Skip finished cars
    if (otherCar.userData && otherCar.userData.finished) continue;

    // Calculate distance between cars
    const dx = car.position.x - otherCar.position.x;
    const dz = car.position.z - otherCar.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Collision box check - simplified as axis-aligned bounding box
    if (Math.abs(dx) < carWidth && Math.abs(dz) < carLength) {
      // Collision detected!

      // Calculate collision response
      // Cars coming from behind have more impact
      const isRearCollision = dz < 0;
      const collisionForce = config.collisionForce;

      // Apply collision effects
      if (car === playerCar) {
        // Player collided with AI
        const speedReduction = isRearCollision
          ? collisionForce * 1.5
          : collisionForce;
        gameState.speed *= 1 - speedReduction;

        // Add some sideways push based on relative positions
        car.position.x += Math.sign(dx) * 0.3;

        // Add screen shake or visual feedback
        shakeCamera(0.2);
      } else {
        // AI collided with another car
        const speedReduction = isRearCollision
          ? collisionForce * 1.2
          : collisionForce * 0.8;
        car.userData.speed *= 1 - speedReduction;

        // Add some sideways push
        car.position.x += Math.sign(dx) * 0.2;
      }

      // Play collision sound
      playCollisionSound();
    }
  }
}

function checkFinish(car, name) {
  if (car.position.z >= window.finishLineZ && !car.userData.finished) {
    car.userData.finished = true;
    const finishTime = Date.now() - gameState.startTime;

    if (car === playerCar) {
      gameState.finished = true;
      gameState.finishTime = finishTime;
      showRaceComplete(name, finishTime);

      // Play finish sound
      playFinishSound();
    } else {
      car.userData.finishTime = finishTime;
      updateLeaderboard();
    }
  }
}

// Car physics and movement

// Update player car
function updatePlayerCar(deltaTime) {
  if (!playerCar) return;

  // Get controls from gameState
  const { accelerate, brake, turnLeft, turnRight, shiftUp, shiftDown } =
    gameState.controls;

  // Handle acceleration
  if (accelerate) {
    // Apply throttle
    applyThrottle(1.0);
  } else {
    applyThrottle(0);
  }

  // Handle braking
  if (brake) {
    applyBrakes(1.0);
  } else {
    applyBrakes(0);
  }

  // Handle steering
  let steeringInput = 0;
  if (turnLeft) steeringInput -= 1;
  if (turnRight) steeringInput += 1;
  applySteering(steeringInput);

  // Handle gear shifting
  if (shiftUp && !gameState.isChangingGear) {
    shiftGearUp();
  }
  if (shiftDown && !gameState.isChangingGear) {
    shiftGearDown();
  }

  // Update physics
  updateCarPhysics(deltaTime);

  // Update car position based on speed and direction
  const moveDistance = gameState.speed * deltaTime;
  playerCar.position.z -= Math.cos(playerCar.rotation.y) * moveDistance;
  playerCar.position.x -= Math.sin(playerCar.rotation.y) * moveDistance;

  // Update car wheels
  if (typeof updateCarWheels === "function") {
    updateCarWheels(playerCar, gameState.speed);
  }

  // Update distance traveled
  if (gameState.started && !gameState.finished) {
    // Calculate distance based on forward movement
    gameState.distance += moveDistance;

    // Check for finish line
    if (gameState.distance >= gameState.finishDistance && !gameState.finished) {
      finishRace();
    }
  }

  // Debug output
  if (gameState.speed > 0.1 && Math.random() < 0.05) {
    console.log(
      `Car position: x=${playerCar.position.x.toFixed(
        2
      )}, z=${playerCar.position.z.toFixed(
        2
      )}, rotation=${playerCar.rotation.y.toFixed(
        2
      )}, speed=${gameState.speed.toFixed(2)}`
    );
  }
}

// Update car physics
function updateCarPhysics(deltaTime) {
  // Calculate engine force based on throttle and current gear
  const engineForce = gameState.throttle * getEngineForce();

  // Calculate drag force (air resistance)
  const dragForce = gameState.speed * gameState.speed * 0.0001;

  // Calculate rolling resistance
  const rollingResistance = gameState.speed * 0.01;

  // Calculate braking force
  const brakeForce = gameState.brakeForce * 2.0;

  // Calculate net force
  const netForce = engineForce - dragForce - rollingResistance - brakeForce;

  // Calculate acceleration (F = ma)
  gameState.acceleration = netForce / gameState.mass;

  // Update speed based on acceleration and delta time
  gameState.speed += gameState.acceleration * deltaTime * 60; // Scale by 60 to normalize for 60fps

  // Ensure speed doesn't go negative when braking/decelerating
  if (gameState.speed < 0) {
    gameState.speed = 0;
    gameState.acceleration = 0;
  }

  // Calculate RPM based on speed and gear
  updateRPM();

  // Debug output (less frequent to avoid console spam)
  if (Math.random() < 0.05) {
    console.log(
      `Speed: ${gameState.speed.toFixed(
        2
      )}, Accel: ${gameState.acceleration.toFixed(
        2
      )}, RPM: ${gameState.rpm.toFixed(0)}, Gear: ${gameState.currentGear}`
    );
  }
}

// Apply throttle input (0.0 to 1.0)
function applyThrottle(amount) {
  gameState.throttle = amount;
}

// Apply brake input (0.0 to 1.0)
function applyBrakes(amount) {
  gameState.brakeForce = amount;
}

// Apply steering input (-1.0 to 1.0)
function applySteering(amount) {
  // Calculate steering angle based on input and speed
  // Reduce steering angle at higher speeds for stability
  const speedFactor = 1.0 - (gameState.speed / 200) * 0.5;
  const steeringAngle = amount * gameState.maxSteeringAngle * speedFactor;

  // Apply steering to car rotation
  playerCar.rotation.y += steeringAngle * 0.05;
}

// Get engine force based on current RPM and gear
function getEngineForce() {
  // If in neutral, no engine force
  if (gameState.currentGear === 0) {
    return 0;
  }

  // Simple engine model
  // Maximum power at around 70-80% of max RPM
  const normalizedRPM = gameState.rpm / gameState.maxRPM;
  let powerFactor = 4.0 * normalizedRPM * (1.0 - normalizedRPM);

  // Apply gear ratio
  const gearRatio = gameState.gearRatios[gameState.currentGear + 1]; // +1 because -1 is reverse

  // Calculate engine force
  let force = powerFactor * gameState.maxEnginePower * gearRatio;

  // Handle reverse gear
  if (gameState.currentGear === -1) {
    force = -force; // Negative force for reverse
  }

  return force;
}

// Update RPM based on speed and current gear
function updateRPM() {
  if (gameState.currentGear === -1) {
    // Reverse gear
    gameState.rpm = gameState.speed * 100;
  } else if (gameState.currentGear === 0) {
    // Neutral gear
    gameState.rpm = Math.max(gameState.idleRPM, gameState.rpm - 50);
  } else {
    // Forward gears
    const gearRatio = gameState.gearRatios[gameState.currentGear + 1]; // +1 because -1 is reverse
    gameState.rpm = gameState.speed * 100 * (1.0 / gearRatio);
  }

  // Limit RPM to max
  if (gameState.rpm > gameState.maxRPM) {
    gameState.rpm = gameState.maxRPM;
  }

  // Idle RPM when stopped
  if (gameState.speed < 0.1) {
    gameState.rpm = gameState.idleRPM;
  }
}

// Shift up a gear
function shiftGearUp() {
  if (gameState.isChangingGear) return;

  if (gameState.currentGear < gameState.gearRatios.length - 2) {
    // -2 because of reverse gear
    gameState.isChangingGear = true;
    gameState.gearChangeStart = Date.now();

    // Shift up after a delay
    setTimeout(() => {
      gameState.currentGear++;
      gameState.isChangingGear = false;

      // Play gear shift sound
      if (gameState.sounds && gameState.sounds.gearShift) {
        gameState.sounds.gearShift.play();
      }

      console.log(`Shifted up to gear ${gameState.currentGear}`);
    }, 200);
  }
}

// Shift down a gear
function shiftGearDown() {
  if (gameState.isChangingGear) return;

  if (gameState.currentGear > -1) {
    gameState.isChangingGear = true;
    gameState.gearChangeStart = Date.now();

    // Shift down after a delay
    setTimeout(() => {
      gameState.currentGear--;
      gameState.isChangingGear = false;

      // Play gear shift sound
      if (gameState.sounds && gameState.sounds.gearShift) {
        gameState.sounds.gearShift.play();
      }

      console.log(`Shifted down to gear ${gameState.currentGear}`);
    }, 200);
  }
}

// Calculate car physics
function calculateCarPhysics(accelerator, brake, steering, deltaTime) {
  // Constants
  const maxSpeed = 200; // km/h
  const acceleration = 50; // km/h per second
  const braking = 100; // km/h per second
  const drag = 10; // km/h per second
  const maxRPM = 8000;
  const idleRPM = 800;
  const gearRatios = [0, 3.5, 2.5, 1.8, 1.3, 1.0, 0.8];
  const finalDriveRatio = 3.7;
  const wheelRadius = 0.3; // meters

  // Current state
  let speed = gameState.speed;
  let rpm = gameState.rpm;
  let gear = gameState.currentGear;

  // Calculate acceleration and braking forces
  let accelerationForce = 0;
  if (accelerator > 0) {
    accelerationForce = accelerator * acceleration * deltaTime;
  }

  let brakingForce = 0;
  if (brake > 0) {
    brakingForce = brake * braking * deltaTime;
  }

  // Apply drag
  const dragForce = (speed / maxSpeed) * drag * deltaTime;

  // Update speed
  speed += accelerationForce - brakingForce - dragForce;

  // Clamp speed
  speed = Math.max(0, Math.min(speed, maxSpeed));

  // Calculate RPM based on speed and gear
  if (speed > 0) {
    // RPM = (speed in m/s) * (60 seconds) * (gearRatio * finalDriveRatio) / (2 * PI * wheelRadius)
    const speedMPS = speed / 3.6; // Convert km/h to m/s
    rpm =
      (speedMPS * 60 * gearRatios[gear] * finalDriveRatio) /
      (2 * Math.PI * wheelRadius);
  } else {
    rpm = idleRPM;
  }

  // Clamp RPM
  rpm = Math.max(idleRPM, Math.min(rpm, maxRPM));

  // Automatic gear shifting
  if (rpm > maxRPM * 0.9 && gear < gearRatios.length - 1) {
    gear++;
    playGearShiftSound();
  } else if (rpm < maxRPM * 0.4 && gear > 1) {
    gear--;
    playGearShiftSound();
  }

  // Calculate forward velocity in units per second
  const forwardVelocity = speed / 3.6; // Convert km/h to m/s

  // Calculate lateral velocity based on steering
  const lateralVelocity = steering * (speed / maxSpeed) * 5;

  return {
    speed: speed,
    rpm: rpm,
    gear: gear,
    forwardVelocity: forwardVelocity,
    lateralVelocity: lateralVelocity,
  };
}

// Physics simulation

// Initialize physics
function initPhysics() {
  console.log("Initializing physics");

  // Set up physics parameters
  gameState.gravity = 9.8; // m/s²
  gameState.friction = 0.05;
  gameState.drag = 0.5;
  gameState.acceleration = 10;
  gameState.brakeForce = 15;
  gameState.turnSpeed = 2.0;
  gameState.maxSpeed = 50;

  console.log("Physics initialized");
}

// Update physics
function updatePhysics(deltaTime) {
  // Apply physics to car
  if (gameState.handbrake) {
    // Handbrake reduces speed faster and allows drifting
    gameState.speed *= 0.95;
  }

  // Check for collisions with track boundaries
  checkTrackBoundaries();

  // Check if car has reached finish line
  checkFinishLine();
}

// Check if car is within track boundaries
function checkTrackBoundaries() {
  if (!window.playerCar) return;

  // Simple boundary check - keep car on the road
  // Road is 10 units wide, centered at x=0
  const roadHalfWidth = 5;

  if (Math.abs(window.playerCar.position.x) > roadHalfWidth) {
    // Car is off the road, apply friction
    gameState.speed *= 0.95;
  }
}

// Check if car has reached finish line
function checkFinishLine() {
  if (!window.playerCar) return;

  // Check if car has crossed finish line
  if (
    window.playerCar.position.z >= gameState.finishLinePosition &&
    !gameState.finished
  ) {
    gameState.finished = true;

    // Show finish message
    const finishMessage = document.getElementById("finish-message");
    if (finishMessage) {
      finishMessage.textContent = "Finish!";
      finishMessage.style.display = "block";
    }

    console.log("Player finished race");

    // Send finish event to server if in multiplayer mode
    if (
      window.multiplayer &&
      window.multiplayer.connection &&
      window.multiplayer.connection.socket
    ) {
      window.multiplayer.connection.socket.emit("playerFinished", {
        time: Date.now() - gameState.startTime,
        distance: gameState.distance,
      });
    }
  }
}

// Export functions to global scope
window.initPhysics = initPhysics;
window.updatePhysics = updatePhysics;
window.checkTrackBoundaries = checkTrackBoundaries;
window.checkFinishLine = checkFinishLine;

// Log to confirm they're defined
console.log("Physics functions defined:");
console.log("- initPhysics:", typeof window.initPhysics);
console.log("- updatePhysics:", typeof window.updatePhysics);
console.log("- checkTrackBoundaries:", typeof window.checkTrackBoundaries);
console.log("- checkFinishLine:", typeof window.checkFinishLine);
