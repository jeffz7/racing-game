// Update AI cars
function updateAICars() {
  if (!window.aiCars || !Array.isArray(window.aiCars)) return;

  window.aiCars.forEach((aiCar) => {
    if (!aiCar.userData || !aiCar.userData.aiState) return;

    const aiState = aiCar.userData.aiState;

    // Simple AI logic - accelerate and occasionally change gears
    const targetSpeed = 60 + Math.random() * 40; // Random target speed between 60-100

    // Accelerate toward target speed
    if (aiState.speed < targetSpeed) {
      aiState.acceleration = 2 + Math.random() * 1; // Random acceleration between 2-3
    } else {
      aiState.acceleration = -1 - Math.random() * 1; // Random deceleration between -1 to -2
    }

    // Update speed based on acceleration
    aiState.speed += aiState.acceleration * 0.1;

    // Ensure speed stays positive
    aiState.speed = Math.max(0, aiState.speed);

    // Update max speed
    if (aiState.speed > aiState.maxSpeed) {
      aiState.maxSpeed = aiState.speed;
    }

    // Move car forward
    aiCar.position.z -= Math.cos(aiCar.rotation.y) * (aiState.speed * 0.01);
    aiCar.position.x -= Math.sin(aiCar.rotation.y) * (aiState.speed * 0.01);

    // Update distance traveled
    aiState.distance += aiState.speed * 0.01;

    // Store distance for leaderboard
    aiCar.distance = aiState.distance;
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

// Initialize AI cars
function initAICars() {
  console.log("Initializing AI cars for single player mode");

  // Clear existing AI cars first
  if (window.aiCars && window.aiCars.length > 0) {
    console.log(`Removing ${window.aiCars.length} existing AI cars`);
    window.aiCars.forEach((car) => {
      scene.remove(car);
    });
    window.aiCars = [];
  } else {
    window.aiCars = [];
  }

  // AI car configuration
  const config = {
    aiCars: 4, // Number of AI cars
  };

  // AI car colors and names
  const aiColors = [
    0xff0000, // Red
    0x00ff00, // Green
    0xffff00, // Yellow
    0xff00ff, // Magenta
    0x00ffff, // Cyan
    0xff8000, // Orange
    0x8000ff, // Purple
  ];

  const aiNames = [
    "Speedy",
    "Racer",
    "Zoom",
    "Flash",
    "Thunder",
    "Lightning",
    "Bolt",
    "Dash",
  ];

  // Create AI cars
  for (let i = 0; i < config.aiCars; i++) {
    // Use different color for each AI car
    const color = aiColors[i % aiColors.length];
    const name = aiNames[i % aiNames.length];

    const aiCar = createCar(color, name);

    // Position AI car at start line
    aiCar.position.set(i * 4 - 6, 0, -40); // Spread cars across starting line

    scene.add(aiCar);
    window.aiCars.push(aiCar);

    // Add name and color to car for leaderboard
    aiCar.userData.name = name;
    aiCar.userData.color = color;

    // Initialize AI state
    aiCar.userData.aiState = {
      speed: 0,
      maxSpeed: 0,
      acceleration: 0,
      currentGear: 1, // Start in 1st gear
      targetGear: 1,
      isChangingGear: false,
      gearChangeStart: 0,
      rpm: 0,
      wheelspin: 0,
      lastGearChangeTime: 0,
      distance: 0,
    };

    console.log(
      `Created AI car ${name} with color 0x${color.toString(16)} at position:`,
      aiCar.position
    );
  }

  console.log(`Created ${window.aiCars.length} AI cars for single player mode`);
}
