// Multiplayer synchronization

// Define the class in the global scope
class MultiplayerSyncManager {
  constructor(manager) {
    console.log("Creating multiplayer sync manager");
    this.manager = manager;
    this.lastSyncTime = 0;
    this.syncInterval = 50; // Sync every 50ms
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    const socket = this.manager.socket;

    if (!socket) {
      console.error("Cannot setup sync event handlers: socket is null");
      return;
    }

    // Player joined
    socket.on("playerJoined", (data) => {
      console.log("Player joined:", data);

      // Add player
      this.manager.playerManager.addPlayer(data.playerId, {
        name: data.playerName,
      });

      // Adjust AI cars
      if (this.manager.isHost) {
        this.manager.aiManager.adjustAiCars();
      }
    });

    // Player left
    socket.on("playerLeft", (data) => {
      console.log("Player left:", data);

      // Remove player
      this.manager.playerManager.removePlayer(data.playerId);

      // Adjust AI cars
      if (this.manager.isHost) {
        this.manager.aiManager.adjustAiCars();
      }
    });

    // Player position update
    socket.on("playerPosition", (data) => {
      // Skip if this is our own position
      if (data.playerId === socket.id) {
        return;
      }

      // Update player position
      const player = this.manager.playerManager.otherPlayers[data.playerId];

      if (player) {
        // Store last position for interpolation
        player.lastPosition = {
          x: player.car.position.x,
          y: player.car.position.y,
          z: player.car.position.z,
        };

        // Update target position
        player.targetPosition = {
          x: data.position.x,
          y: data.position.y,
          z: data.position.z,
        };

        // Update immediately if first update or large distance
        const distance = Math.sqrt(
          Math.pow(player.car.position.x - data.position.x, 2) +
            Math.pow(player.car.position.y - data.position.y, 2) +
            Math.pow(player.car.position.z - data.position.z, 2)
        );

        if (!player.hasReceivedPosition || distance > 10) {
          player.car.position.set(
            data.position.x,
            data.position.y,
            data.position.z
          );
          player.hasReceivedPosition = true;
        }

        // Update last update time
        player.lastUpdateTime = Date.now();

        // Update speed and distance
        player.speed = data.speed || 0;
        player.distance = data.distance || 0;

        // Update finished state
        if (data.finished && !player.finished) {
          player.finished = true;
          console.log(`Player ${player.name} finished the race!`);
        }

        // Log position update
        console.log(
          `Updated position for player ${data.playerId}:`,
          data.position
        );
      } else {
        console.warn(`Received position for unknown player: ${data.playerId}`);

        // Try to add the player if they don't exist
        this.manager.playerManager.addPlayer(data.playerId, {
          name: data.playerName || "Unknown Player",
        });
      }
    });

    // AI car position update
    socket.on("aiCarPositions", (data) => {
      // Skip if we're the host (we're already updating AI cars)
      if (this.manager.isHost) {
        return;
      }

      // Update AI car positions
      for (let i = 0; i < data.aiCars.length; i++) {
        const aiCarData = data.aiCars[i];

        // Find or create AI car
        let aiCar = this.manager.aiManager.aiCars[i];

        if (!aiCar) {
          // Create new AI car
          const car = createCar(0xa52a2a, aiCarData.name);
          scene.add(car);

          aiCar = {
            car: car,
            name: aiCarData.name,
            speed: 0,
            distance: 0,
            finished: false,
          };

          this.manager.aiManager.aiCars[i] = aiCar;
        }

        // Update position
        aiCar.car.position.set(
          aiCarData.position.x,
          aiCarData.position.y,
          aiCarData.position.z
        );

        // Update distance and finished state
        aiCar.distance = aiCarData.distance;
        aiCar.finished = aiCarData.finished;

        // Update wheels
        if (typeof updateCarWheels === "function") {
          updateCarWheels(aiCar.car, 50); // Assume moderate speed
        }
      }
    });

    // Request for position
    socket.on("requestPosition", () => {
      console.log("Received request for position, sending immediately");

      // Send position immediately
      this.sendPosition(true);
    });
  }

  // Send player position to server
  sendPosition(force = false) {
    const now = Date.now();

    // Limit send rate unless forced
    if (!force && now - this.lastSyncTime < this.syncInterval) {
      return;
    }

    this.lastSyncTime = now;

    // Always send position in multiplayer, even if race hasn't started
    // This ensures other players can see us at the starting line
    this.manager.socket.emit("updatePosition", {
      position: {
        x: window.playerCar.position.x,
        y: window.playerCar.position.y,
        z: window.playerCar.position.z,
      },
      speed: gameState.speed,
      distance: gameState.distance,
      finished: gameState.finished,
    });
  }

  update(deltaTime) {
    // Skip if not connected
    if (!this.manager.connection || !this.manager.connection.socket) {
      return;
    }

    // Send position even if game hasn't started
    // This ensures other players can see us at the starting line
    const now = Date.now();
    if (now - this.lastSyncTime < this.syncInterval) {
      return;
    }

    // Update last sync time
    this.lastSyncTime = now;

    // Send player position to server
    this.sendPlayerPosition();
  }

  sendPlayerPosition(force = false) {
    // Skip if player car doesn't exist
    if (!window.playerCar) {
      return;
    }

    // Skip if not connected
    if (!this.manager.connection || !this.manager.connection.socket) {
      return;
    }

    // Check if we should send based on time interval, unless forced
    const now = Date.now();
    if (!force && now - this.lastSyncTime < this.syncInterval) {
      return;
    }

    // Update last sync time
    this.lastSyncTime = now;

    // Send position to server
    this.manager.connection.socket.emit("updatePosition", {
      position: {
        x: window.playerCar.position.x,
        y: window.playerCar.position.y,
        z: window.playerCar.position.z,
      },
      speed: gameState.speed,
      distance: gameState.distance,
      finished: gameState.finished,
    });
  }
}

// Make sure the class is defined globally
window.MultiplayerSyncManager = MultiplayerSyncManager;

// Log to confirm it's defined
console.log(
  "MultiplayerSyncManager defined:",
  typeof window.MultiplayerSyncManager
);
