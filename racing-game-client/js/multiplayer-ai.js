// Multiplayer AI car management

class MultiplayerAIManager {
  constructor(manager) {
    console.log("Creating multiplayer AI manager");
    this.manager = manager;
    this.aiCars = [];
    this.maxPlayers = 5; // Maximum number of players (including AI)
    this.minAiCars = 2; // Minimum number of AI cars to add
    this.aiInitialized = false; // Whether AI cars have been initialized

    // Only set up event handlers if manager and socket exist
    if (
      this.manager &&
      this.manager.connection &&
      this.manager.connection.socket
    ) {
      this.setupEventHandlers();
    } else {
      console.warn(
        "Cannot set up AI event handlers: manager or socket is null"
      );

      // Set up event handlers later when socket is available
      this.pendingSetup = true;
    }
  }

  setupEventHandlers() {
    if (
      !this.manager ||
      !this.manager.connection ||
      !this.manager.connection.socket
    ) {
      console.warn(
        "Cannot set up AI event handlers: manager or socket is null"
      );
      this.pendingSetup = true;
      return;
    }

    console.log("Setting up AI event handlers");
    this.pendingSetup = false;

    // Handle AI car added event
    this.manager.connection.socket.on("aiCarAdded", (data) => {
      console.log("AI car added:", data);
      this.addAICar(data.car);
    });

    // Handle AI car position update
    this.manager.connection.socket.on("aiCarPosition", (data) => {
      this.updateAICarPosition(data);
    });

    // Handle AI car removed
    this.manager.connection.socket.on("aiCarRemoved", (data) => {
      this.removeAICar(data.carId);
    });

    // Handle AI car finished
    this.manager.connection.socket.on("aiCarFinished", (data) => {
      console.log(`AI car ${data.name} finished race`);

      // Update leaderboard
      if (typeof updateLeaderboard === "function") {
        updateLeaderboard(data.finishOrder);
      }
    });
  }

  // Method to check and set up event handlers if they weren't set up in constructor
  checkAndSetupEventHandlers() {
    if (
      this.pendingSetup &&
      this.manager &&
      this.manager.connection &&
      this.manager.connection.socket
    ) {
      this.setupEventHandlers();
    }
  }

  // Add AI cars if there are fewer than maxPlayers
  addAiCarsIfNeeded() {
    // Only the host should manage AI cars
    if (!this.manager.isHost) {
      console.log("Not the host, skipping AI car management");
      return;
    }

    // Calculate how many real players we have
    const realPlayerCount = this.manager.playerManager.getPlayerCount();

    // Calculate how many AI cars we need
    const aiCarsNeeded = Math.max(
      this.minAiCars,
      this.maxPlayers - realPlayerCount
    );

    console.log(
      `Real players: ${realPlayerCount}, AI cars needed: ${aiCarsNeeded}`
    );

    // Remove existing AI cars
    this.removeAiCars();

    // Create AI cars
    this.createAiCars(aiCarsNeeded);

    // Log the current state
    console.log(
      `Current game state: ${realPlayerCount} real players, ${this.aiCars.length} AI cars`
    );
  }

  // Adjust AI cars when players join/leave
  adjustAiCars() {
    // Only the host should manage AI cars
    if (!this.manager.isHost) {
      return;
    }

    // Calculate how many real players we have
    const realPlayerCount = this.manager.playerManager.getPlayerCount();

    // Calculate how many AI cars we need
    const aiCarsNeeded = Math.max(
      this.minAiCars,
      this.maxPlayers - realPlayerCount
    );

    console.log(
      `Adjusting AI cars. Real players: ${realPlayerCount}, Total: ${
        realPlayerCount + this.aiCars.length
      }, Max: ${this.maxPlayers}`
    );

    // If we have too many AI cars, remove some
    if (this.aiCars.length > aiCarsNeeded) {
      const carsToRemove = this.aiCars.length - aiCarsNeeded;
      console.log(`Removing ${carsToRemove} AI cars`);

      for (let i = 0; i < carsToRemove; i++) {
        this.removeAiCar(this.aiCars.length - 1);
      }
    }
    // If we need more AI cars, add some
    else if (this.aiCars.length < aiCarsNeeded) {
      const carsToAdd = aiCarsNeeded - this.aiCars.length;
      console.log(`Creating ${carsToAdd} AI cars`);

      this.createAiCars(carsToAdd);
    }

    console.log(
      `After adjustment: ${realPlayerCount} real players, ${this.aiCars.length} AI cars`
    );
  }

  // Remove all AI cars
  removeAiCars() {
    console.log(`Removing ${this.aiCars.length} AI cars`);

    // Remove each car from the scene
    for (const aiCar of this.aiCars) {
      if (aiCar.car) {
        scene.remove(aiCar.car);
      }
    }

    // Clear the array
    this.aiCars = [];
  }

  // Remove a specific AI car
  removeAiCar(index) {
    if (index < 0 || index >= this.aiCars.length) {
      return;
    }

    const aiCar = this.aiCars[index];

    if (aiCar.car) {
      scene.remove(aiCar.car);
    }

    this.aiCars.splice(index, 1);
  }

  // Create AI cars
  createAiCars(count) {
    // AI car colors
    const aiColors = [
      0xa52a2a, // Brown
      0x800080, // Purple
      0xff8c00, // Dark Orange
      0x008080, // Teal
      0x4b0082, // Indigo
    ];

    // AI car names
    const aiNames = [
      "AI-Speedy",
      "AI-Racer",
      "AI-Zoom",
      "AI-Turbo",
      "AI-Flash",
    ];

    // Create AI cars
    for (let i = 0; i < count; i++) {
      const colorIndex = i % aiColors.length;
      const nameIndex = i % aiNames.length;

      const car = createCar(aiColors[colorIndex], aiNames[nameIndex]);

      // Position car at the start line, offset to the right
      // Start at position 4 (after player and potential other human players)
      const position = 4 + i * 2;
      car.position.set(position, 0, 0);

      // Add car to scene
      scene.add(car);

      // Add car to AI cars list
      this.aiCars.push({
        car: car,
        name: aiNames[nameIndex],
        speed: 0,
        distance: 0,
        finished: false,
        // Add some randomness to AI behavior
        maxSpeed: 120 + Math.random() * 40, // 120-160 km/h
        acceleration: 30 + Math.random() * 20, // 30-50 km/h per second
        braking: 50 + Math.random() * 30, // 50-80 km/h per second
        reactionTime: 0.5 + Math.random() * 1.5, // 0.5-2.0 seconds
      });

      console.log(
        `Created AI car ${aiNames[nameIndex]} at position:`,
        car.position
      );
    }
  }

  // Update AI cars
  updateAiCars(deltaTime) {
    // Only the host should update AI cars
    if (!this.manager.isHost) {
      return;
    }

    // Don't update if race hasn't started
    if (!gameState.started) {
      return;
    }

    // Update each AI car
    for (const aiCar of this.aiCars) {
      // Calculate target speed
      let targetSpeed = aiCar.maxSpeed;

      // Slow down for curves (simplified)
      targetSpeed *= 0.8 + Math.random() * 0.2; // 80-100% of max speed

      // Accelerate or brake towards target speed
      if (aiCar.speed < targetSpeed) {
        aiCar.speed += aiCar.acceleration * deltaTime;
        if (aiCar.speed > targetSpeed) {
          aiCar.speed = targetSpeed;
        }
      } else if (aiCar.speed > targetSpeed) {
        aiCar.speed -= aiCar.braking * deltaTime;
        if (aiCar.speed < targetSpeed) {
          aiCar.speed = targetSpeed;
        }
      }

      // Move forward
      const moveDistance = aiCar.speed * deltaTime * 60; // Scale by 60 for 60fps
      aiCar.car.position.z -= moveDistance;

      // Update distance
      aiCar.distance += moveDistance;

      // Check for finish
      if (aiCar.distance >= gameState.finishDistance && !aiCar.finished) {
        aiCar.finished = true;
        console.log(`AI car ${aiCar.name} finished the race!`);
      }

      // Update wheels
      if (typeof updateCarWheels === "function") {
        updateCarWheels(aiCar.car, aiCar.speed);
      }
    }

    // Broadcast AI car positions to other players
    if (this.manager.connection && this.aiCars.length > 0) {
      this.manager.connection.socket.emit("updateAiCars", {
        aiCars: this.aiCars.map((car) => ({
          name: car.name,
          position: {
            x: car.car.position.x,
            y: car.car.position.y,
            z: car.car.position.z,
          },
          distance: car.distance,
          finished: car.finished,
        })),
      });
    }
  }

  addAICar(aiCarData) {
    console.log(`Adding AI car ${aiCarData.name} (${aiCarData.id})`);

    // Create car with AI color
    const color = 0xff0000; // Red for AI
    const car = createCar(color, aiCarData.name);

    // Position car at its starting position if available
    if (aiCarData.startPosition) {
      car.position.set(
        aiCarData.startPosition.x,
        aiCarData.startPosition.y,
        aiCarData.startPosition.z
      );
    } else if (aiCarData.position) {
      // Fall back to current position if starting position not available
      car.position.set(
        aiCarData.position.x,
        aiCarData.position.y,
        aiCarData.position.z
      );
    }

    // Add car to scene
    scene.add(car);

    // Store AI car
    this.aiCars.push({
      id: aiCarData.id,
      car: car,
      data: aiCarData,
      lastPosition: { ...car.position },
      lastUpdateTime: Date.now(),
      interpolationStart: { ...car.position },
      interpolationTarget: { ...car.position },
      interpolationStartTime: Date.now(),
    });

    console.log(
      `Added AI car ${aiCarData.name} at position (${car.position.x}, ${car.position.y}, ${car.position.z})`
    );
  }

  updateAICarPosition(data) {
    // Find AI car
    const aiCar = this.aiCars.find((car) => car.id === data.carId);

    if (!aiCar) {
      console.warn(`AI car ${data.carId} not found for position update`);
      return;
    }

    // Set up interpolation
    aiCar.interpolationStart = { ...aiCar.car.position };
    aiCar.interpolationTarget = data.position;
    aiCar.interpolationStartTime = Date.now();
    aiCar.lastUpdateTime = Date.now();
    aiCar.speed = data.speed;
  }

  removeAICar(carId) {
    // Find AI car
    const aiCarIndex = this.aiCars.findIndex((car) => car.id === carId);

    if (aiCarIndex === -1) {
      console.warn(`AI car ${carId} not found for removal`);
      return;
    }

    // Remove car from scene
    scene.remove(this.aiCars[aiCarIndex].car);

    // Remove car from array
    this.aiCars.splice(aiCarIndex, 1);

    console.log(`Removed AI car ${carId}`);
  }

  updateAICars(deltaTime) {
    // Check if event handlers need to be set up
    this.checkAndSetupEventHandlers();

    // Interpolate AI car positions
    for (const aiCar of this.aiCars) {
      // Skip if no position data
      if (!aiCar.interpolationTarget) continue;

      // Calculate interpolation factor
      const interpolationDuration = 100; // 100ms interpolation
      const timeSinceUpdate = Date.now() - aiCar.interpolationStartTime;
      const factor = Math.min(timeSinceUpdate / interpolationDuration, 1);

      // Interpolate position
      aiCar.car.position.x =
        aiCar.interpolationStart.x +
        (aiCar.interpolationTarget.x - aiCar.interpolationStart.x) * factor;
      aiCar.car.position.y =
        aiCar.interpolationStart.y +
        (aiCar.interpolationTarget.y - aiCar.interpolationStart.y) * factor;
      aiCar.car.position.z =
        aiCar.interpolationStart.z +
        (aiCar.interpolationTarget.z - aiCar.interpolationStart.z) * factor;

      // Update car rotation based on movement direction
      if (
        factor < 1 &&
        (aiCar.interpolationTarget.x !== aiCar.interpolationStart.x ||
          aiCar.interpolationTarget.z !== aiCar.interpolationStart.z)
      ) {
        // Calculate direction
        const dx = aiCar.interpolationTarget.x - aiCar.interpolationStart.x;
        const dz = aiCar.interpolationTarget.z - aiCar.interpolationStart.z;

        // Calculate angle
        const angle = Math.atan2(dx, dz);

        // Set rotation
        aiCar.car.rotation.y = angle;
      }

      // Update wheels animation
      if (aiCar.speed && aiCar.speed > 0) {
        if (typeof updateCarWheels === "function") {
          updateCarWheels(aiCar.car, aiCar.speed);
        }
      }
    }
  }
}

// Export class
window.MultiplayerAIManager = MultiplayerAIManager;
