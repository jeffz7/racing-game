// Multiplayer player management

// Define the class in the global scope
window.MultiplayerPlayersManager = class MultiplayerPlayersManager {
  constructor(manager) {
    console.log("Creating multiplayer players manager");
    this.manager = manager;
    this.otherPlayers = {};
    this.otherPlayerCars = {};
  }

  updatePlayerList(players) {
    console.log("Updating player list:", players);

    // Clear existing players
    for (const id in this.otherPlayers) {
      this.removePlayer(id);
    }

    // Add players
    for (const player of players) {
      if (player.id !== this.manager.socket.id) {
        console.log(`Adding player from list: ${player.name} (${player.id})`);
        this.addPlayer(player.id, {
          name: player.name,
        });
      }
    }

    // Force AI car update after player list is updated
    console.log("Forcing AI car update after player list update");
    this.manager.aiManager.addAiCarsIfNeeded();
  }

  addPlayer(id, playerData) {
    // Skip if id is undefined or null
    if (!id) {
      console.error("Cannot add player with undefined/null id");
      return;
    }

    // Skip if this is our own ID
    if (id === this.manager.socket.id) {
      console.log(`Skipping adding our own player ID: ${id}`);
      return;
    }

    console.log(`Adding player: ${playerData?.name || "Unknown"} (${id})`);

    // Check if player already exists
    if (this.otherPlayers[id]) {
      console.warn(`Player ${id} already exists, removing first`);
      this.removePlayer(id);
    }

    // Create car
    const carColor = 0xff0000; // Red for other players
    const car = createCar(carColor, playerData?.name || "Player");

    // Position car at the start line, offset to the right
    const playerCount = Object.keys(this.otherPlayers).length;
    car.position.set(2 * (playerCount + 1), 0, 0); // Offset by 2 units per player

    // Add car to scene
    scene.add(car);

    // Add player to list
    this.otherPlayers[id] = {
      id: id,
      name: playerData?.name || "Player",
      car: car,
      finished: false,
      distance: 0,
      speed: 0,
      lastUpdateTime: Date.now(),
      lastPosition: { x: car.position.x, y: car.position.y, z: car.position.z },
    };

    console.log(`Added player ${id} with car at position:`, car.position);
  }

  removePlayer(id) {
    console.log(`Removing player: ${id}`);

    if (this.otherPlayers[id]) {
      // Remove car from scene
      if (this.otherPlayers[id].car) {
        scene.remove(this.otherPlayers[id].car);
      }

      // Remove player from list
      delete this.otherPlayers[id];

      console.log(`Removed player ${id}`);

      // Add AI cars if needed
      this.manager.aiManager.addAiCarsIfNeeded();
    }
  }

  updateOtherPlayers(deltaTime) {
    for (const id in this.otherPlayers) {
      const player = this.otherPlayers[id];

      if (player.car && player.speed && player.speed > 0) {
        // Update wheels animation
        if (typeof updateCarWheels === "function") {
          updateCarWheels(player.car, player.speed);
        }
      }
    }
  }

  getPlayerCount() {
    return Object.keys(this.otherPlayers).length + 1; // +1 for local player
  }

  // Clear all other players
  clearAllPlayers() {
    console.log("Clearing all other players");

    for (const id in this.otherPlayers) {
      this.removePlayer(id);
    }
  }

  createOtherPlayerCars(players) {
    console.log("Creating other player cars:", players);

    // Clear existing cars
    this.clearOtherPlayerCars();

    // Check if connection and socket exist
    if (!this.manager.connection || !this.manager.connection.socket) {
      console.error(
        "Cannot create other player cars: connection or socket is null"
      );
      return;
    }

    // Create cars for other players
    for (const player of players) {
      // Skip own player
      if (player.id === this.manager.connection.socket.id) {
        continue;
      }

      console.log(`Creating car for player ${player.name} (${player.id})`);

      // Create car with random color
      const color = this.getRandomCarColor();
      const car = createCar(color, player.name);

      // Position car at its starting position if available
      if (player.startPosition) {
        car.position.set(
          player.startPosition.x,
          player.startPosition.y,
          player.startPosition.z
        );
      } else if (player.position) {
        // Fall back to current position if starting position not available
        car.position.set(
          player.position.x,
          player.position.y,
          player.position.z
        );
      }

      // Add car to scene
      scene.add(car);

      // Store car
      this.otherPlayerCars[player.id] = {
        car: car,
        lastPosition: { ...car.position },
        lastUpdateTime: Date.now(),
        interpolationStart: { ...car.position },
        interpolationTarget: { ...car.position },
        interpolationStartTime: Date.now(),
        name: player.name,
      };

      console.log(
        `Created car for player ${player.name} at position (${car.position.x}, ${car.position.y}, ${car.position.z})`
      );
    }
  }

  createPlayerCar(playerId, playerName, startPosition = null) {
    console.log(`Creating car for player ${playerName} (${playerId})`);

    // Check if car already exists
    if (this.otherPlayerCars[playerId]) {
      console.warn(`Car for player ${playerId} already exists, removing first`);
      this.removePlayerCar(playerId);
    }

    // Create car with random color
    const color = this.getRandomCarColor();
    const car = createCar(color, playerName);

    // Position car at its starting position if available
    if (startPosition) {
      car.position.set(startPosition.x, startPosition.y, startPosition.z);
    }

    // Add car to scene
    scene.add(car);

    // Store car
    this.otherPlayerCars[playerId] = {
      car: car,
      lastPosition: { ...car.position },
      lastUpdateTime: Date.now(),
      interpolationStart: { ...car.position },
      interpolationTarget: { ...car.position },
      interpolationStartTime: Date.now(),
      name: playerName,
    };

    console.log(
      `Created car for player ${playerName} at position (${car.position.x}, ${car.position.y}, ${car.position.z})`
    );

    return car;
  }

  clearOtherPlayerCars() {
    console.log("Clearing other player cars");

    // Remove cars from scene
    for (const playerId in this.otherPlayerCars) {
      scene.remove(this.otherPlayerCars[playerId].car);
    }

    // Clear cars object
    this.otherPlayerCars = {};
  }

  removePlayerCar(playerId) {
    console.log(`Removing car for player ${playerId}`);

    // Check if car exists
    if (!this.otherPlayerCars[playerId]) {
      console.warn(`Car for player ${playerId} not found`);
      return;
    }

    // Remove car from scene
    scene.remove(this.otherPlayerCars[playerId].car);

    // Remove car from object
    delete this.otherPlayerCars[playerId];
  }

  updatePlayerPosition(playerId, position, speed) {
    // Check if car exists
    if (!this.otherPlayerCars[playerId]) {
      console.warn(`Car for player ${playerId} not found for position update`);

      // Try to create the car if it doesn't exist
      if (this.manager.players) {
        const player = this.manager.players.find((p) => p.id === playerId);
        if (player) {
          console.log(
            `Creating missing car for player ${player.name} (${playerId})`
          );
          this.createPlayerCar(playerId, player.name, position);
          return;
        }
      }

      return;
    }

    // Set up interpolation
    this.otherPlayerCars[playerId].interpolationStart = {
      ...this.otherPlayerCars[playerId].car.position,
    };
    this.otherPlayerCars[playerId].interpolationTarget = position;
    this.otherPlayerCars[playerId].interpolationStartTime = Date.now();
    this.otherPlayerCars[playerId].lastUpdateTime = Date.now();
    this.otherPlayerCars[playerId].speed = speed;
  }

  updateOtherPlayerCars(deltaTime) {
    // Interpolate other player car positions
    for (const playerId in this.otherPlayerCars) {
      const playerCar = this.otherPlayerCars[playerId];

      // Skip if no position data
      if (!playerCar.interpolationTarget) continue;

      // Calculate interpolation factor
      const interpolationDuration = 100; // 100ms interpolation
      const timeSinceUpdate = Date.now() - playerCar.interpolationStartTime;
      const factor = Math.min(timeSinceUpdate / interpolationDuration, 1);

      // Interpolate position
      playerCar.car.position.x =
        playerCar.interpolationStart.x +
        (playerCar.interpolationTarget.x - playerCar.interpolationStart.x) *
          factor;
      playerCar.car.position.y =
        playerCar.interpolationStart.y +
        (playerCar.interpolationTarget.y - playerCar.interpolationStart.y) *
          factor;
      playerCar.car.position.z =
        playerCar.interpolationStart.z +
        (playerCar.interpolationTarget.z - playerCar.interpolationStart.z) *
          factor;

      // Update car rotation based on movement direction
      if (
        factor < 1 &&
        (playerCar.interpolationTarget.x !== playerCar.interpolationStart.x ||
          playerCar.interpolationTarget.z !== playerCar.interpolationStart.z)
      ) {
        // Calculate direction
        const dx =
          playerCar.interpolationTarget.x - playerCar.interpolationStart.x;
        const dz =
          playerCar.interpolationTarget.z - playerCar.interpolationStart.z;

        // Calculate angle
        const angle = Math.atan2(dx, dz);

        // Set rotation
        playerCar.car.rotation.y = angle;
      }

      // Update wheels animation
      if (playerCar.speed && playerCar.speed > 0) {
        if (typeof updateCarWheels === "function") {
          updateCarWheels(playerCar.car, playerCar.speed);
        }
      }
    }
  }

  getRandomCarColor() {
    // Generate random color
    const colors = [
      0x3498db, // Blue
      0x2ecc71, // Green
      0xe74c3c, // Red
      0xf39c12, // Orange
      0x9b59b6, // Purple
      0x1abc9c, // Teal
      0xd35400, // Pumpkin
      0x34495e, // Dark blue
    ];

    return colors[Math.floor(Math.random() * colors.length)];
  }
};

// Make sure the class is defined globally
console.log(
  "MultiplayerPlayersManager defined:",
  typeof window.MultiplayerPlayersManager
);
