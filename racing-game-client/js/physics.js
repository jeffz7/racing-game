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
