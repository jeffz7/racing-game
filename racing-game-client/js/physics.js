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

  // Check if we've crossed the finish line
  if (!gameState.finishCrossed && gameState.distance >= 1000) {
    console.log("Player crossed finish line!");
    gameState.finishCrossed = true;

    // Trigger finish line effects
    triggerFinishLineEffects();

    // Send finish event to server in multiplayer mode
    if (gameState.isMultiplayer && window.multiplayer) {
      window.multiplayer.socket.emit("updatePosition", {
        position: {
          x: playerCar.position.x,
          y: playerCar.position.y,
          z: playerCar.position.z,
        },
        rotation: {
          x: playerCar.rotation.x,
          y: playerCar.rotation.y,
          z: playerCar.rotation.z,
        },
        speed: gameState.speed,
        distance: gameState.distance,
        finished: false, // Not fully finished yet
      });
    }

    // Show finish notification
    showFinishNotification();
  }

  // Improve the finish line deceleration logic
  // Apply finish line deceleration if we've crossed the finish line
  if (gameState.finishCrossed && !gameState.finished) {
    // Calculate how far past the finish line we are
    const distancePastFinish = gameState.distance - gameState.finishDistance;

    // Get deceleration and stop distances from config
    const decelerationDistance = config.finish.decelerationDistance;
    const stopDistance = config.finish.stopDistance;

    // Apply gradual deceleration based on distance past finish line
    if (distancePastFinish < decelerationDistance) {
      // Gradually reduce throttle input
      const decelerationFactor = 1 - distancePastFinish / decelerationDistance;
      gameState.throttle *= decelerationFactor;

      // Apply some braking (stronger than before)
      gameState.brakeForce = 0.5;

      // Limit maximum speed
      const maxSpeedFactor = 1 - distancePastFinish / decelerationDistance;
      if (gameState.speed > maxSpeedFactor * config.carSpeed) {
        gameState.speed = maxSpeedFactor * config.carSpeed;
      }
    } else {
      // Past deceleration zone, apply full braking to stop
      gameState.throttle = 0;
      gameState.brakeForce = 1.0;

      // Force stronger deceleration
      gameState.speed *= 0.95;

      // Check if we've stopped or reached the barrier
      if (
        Math.abs(gameState.speed) < 0.01 ||
        distancePastFinish >= stopDistance
      ) {
        gameState.speed = 0;
        gameState.finished = true;
        console.log(
          "Player fully stopped after finish line at distance:",
          gameState.distance
        );

        // Send final position to server in multiplayer mode
        if (gameState.isMultiplayer && window.multiplayer) {
          window.multiplayer.socket.emit("updatePosition", {
            position: {
              x: playerCar.position.x,
              y: playerCar.position.y,
              z: playerCar.position.z,
            },
            rotation: {
              x: playerCar.rotation.x,
              y: playerCar.rotation.y,
              z: playerCar.rotation.z,
            },
            speed: 0,
            distance: gameState.distance,
            finished: true, // Now fully finished
          });
        }

        // Show finish results
        showFinishResults();
      }
    }
  }

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

// Add this function to trigger finish line effects
function triggerFinishLineEffects() {
  console.log("Triggering finish line effects");

  // Show confetti
  if (window.finishConfetti) {
    window.finishConfetti.visible = true;

    // Hide confetti after 10 seconds
    setTimeout(() => {
      if (window.finishConfetti) {
        window.finishConfetti.visible = false;
      }
    }, 10000);
  }

  // Play finish sound
  if (
    window.audioManager &&
    typeof window.audioManager.playSound === "function"
  ) {
    window.audioManager.playSound("finish");
  } else {
    // Fallback if audio manager not available
    console.log("Audio manager not available for finish sound");
  }

  // Add camera shake effect
  if (window.camera) {
    const originalPosition = {
      x: window.camera.position.x,
      y: window.camera.position.y,
      z: window.camera.position.z,
    };

    // Simple camera shake
    let shakeTime = 0;
    const shakeInterval = setInterval(() => {
      if (shakeTime >= 1000) {
        clearInterval(shakeInterval);
        // Reset camera position
        if (window.camera) {
          window.camera.position.set(
            originalPosition.x,
            originalPosition.y,
            originalPosition.z
          );
        }
        return;
      }

      // Apply random offset
      if (window.camera) {
        window.camera.position.x =
          originalPosition.x + (Math.random() - 0.5) * 0.5;
        window.camera.position.y =
          originalPosition.y + (Math.random() - 0.5) * 0.5;
      }

      shakeTime += 50;
    }, 50);
  }
}

// Export functions
window.updatePlayerCar = updatePlayerCar;
window.shiftGearUp = shiftGearUp;
window.shiftGearDown = shiftGearDown;
