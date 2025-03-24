class MultiplayerManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.otherPlayers = {}; // Store other player objects
    this.aiCars = []; // Store AI cars
    this.gameId = null;
    this.playerName = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.carModels = {}; // Cache for car models

    console.log("MultiplayerManager created");
  }

  connect(serverUrl, gameId, playerName) {
    console.log(`Attempting to connect to server: ${serverUrl}`);
    console.log(`Game ID: ${gameId}, Player Name: ${playerName}`);

    // Store these values
    this.serverUrl = serverUrl;
    this.gameId = gameId;
    this.playerName = playerName;

    // Check if Socket.IO is loaded
    if (!window.io) {
      console.log("Socket.IO not loaded, loading from CDN...");

      const script = document.createElement("script");
      script.src = "https://cdn.socket.io/4.5.4/socket.io.min.js";
      script.onload = () => {
        console.log("Socket.IO loaded successfully");
        this.initializeConnection(serverUrl, gameId, playerName);
      };
      script.onerror = (error) => {
        console.error("Failed to load Socket.IO:", error);
        alert("Failed to load multiplayer library. Please try again.");
      };
      document.head.appendChild(script);
    } else {
      console.log("Socket.IO already loaded");
      this.initializeConnection(serverUrl, gameId, playerName);
    }
  }

  initializeConnection(serverUrl, gameId, playerName) {
    console.log(`Initializing connection to ${serverUrl}`);

    try {
      // Create socket connection
      this.socket = io(serverUrl);

      // Show connecting status
      this.showConnectionStatus("connecting", "Connecting to server...");

      // Connection successful
      this.socket.on("connect", () => {
        console.log("Connected to server with socket ID:", this.socket.id);
        this.connected = true;

        // Show connected status
        this.showConnectionStatus("connected", "Connected to server");

        // Join the game
        this.socket.emit("joinGame", {
          gameId: gameId,
          playerName: playerName,
        });

        console.log(`Joined game ${gameId} as ${playerName}`);
      });

      // Connection error
      this.socket.on("connect_error", (error) => {
        console.error("Connection error:", error);

        // Show error status
        this.showConnectionStatus(
          "error",
          "Connection error: " + error.message
        );
      });

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error("Error initializing connection:", error);

      // Show error status
      this.showConnectionStatus("error", "Failed to connect: " + error.message);

      alert(`Failed to connect to the server: ${error.message}`);
    }
  }

  showConnectionStatus(status, message) {
    console.log(`Connection status: ${status} - ${message}`);

    // Create or update status element
    let statusElement = document.getElementById("connection-status");

    if (!statusElement) {
      statusElement = document.createElement("div");
      statusElement.id = "connection-status";
      statusElement.style.position = "fixed";
      statusElement.style.bottom = "10px";
      statusElement.style.right = "10px";
      statusElement.style.padding = "10px";
      statusElement.style.borderRadius = "5px";
      statusElement.style.fontFamily = "Arial, sans-serif";
      statusElement.style.zIndex = "1000";
      document.body.appendChild(statusElement);
    }

    // Set styles based on status
    switch (status) {
      case "connecting":
        statusElement.style.backgroundColor = "rgba(255, 165, 0, 0.8)"; // Orange
        break;
      case "connected":
        statusElement.style.backgroundColor = "rgba(0, 128, 0, 0.8)"; // Green
        // Hide after 3 seconds
        setTimeout(() => {
          statusElement.style.display = "none";
        }, 3000);
        break;
      case "error":
      case "disconnected":
        statusElement.style.backgroundColor = "rgba(255, 0, 0, 0.8)"; // Red
        break;
      default:
        statusElement.style.backgroundColor = "rgba(0, 0, 0, 0.8)"; // Black
    }

    statusElement.style.color = "white";
    statusElement.textContent = message;
    statusElement.style.display = "block";
  }

  setupEventListeners() {
    if (!this.socket) {
      console.error("Cannot set up event listeners: socket is null");
      return;
    }

    // Handle new player joining
    this.socket.on("playerJoined", (data) => {
      console.log("Player joined:", data);

      // If this player replaced an AI car, we've already handled the AI car removal
      // Just add the new player
      this.addRemotePlayerToScene(
        data.playerId,
        data.playerName,
        data.players[data.playerId].position
      );

      // Update the player list in the UI
      this.updatePlayerList(data.players);

      if (typeof updateLeaderboard === "function") {
        updateLeaderboard();
      }

      // Important: Position our car at the server-assigned position
      const myPlayerData = data.players[this.socket.id];
      if (myPlayerData && myPlayerData.position) {
        console.log("Setting player car position to:", myPlayerData.position);

        // Set the player car position based on server data
        playerCar.position.set(
          myPlayerData.position.x,
          myPlayerData.position.y,
          myPlayerData.position.z
        );

        // Also update the camera to follow from the new position
        updateCameraPosition();
      }
    });

    // Handle player leaving
    this.socket.on("playerLeft", (data) => {
      console.log(`Player left: ${data.id}`);

      if (this.otherPlayers[data.id]) {
        this.removePlayer(data.id);

        if (typeof updateLeaderboard === "function") {
          updateLeaderboard();
        }
      }
    });

    // Handle position updates from other players
    this.socket.on("playerPosition", (data) => {
      // Skip updates for our own car
      if (data.id === this.socket.id) return;

      console.log(`Received position update from ${data.id}:`, data);

      // Update or create other player
      this.updateOtherPlayer(data);

      // Update leaderboard
      if (typeof updateLeaderboard === "function") {
        updateLeaderboard();
      }

      // Update remote player position
      if (this.otherPlayers[data.id]) {
        const remotePlayer = this.otherPlayers[data.id];

        // Update position
        remotePlayer.car.position.set(
          data.position.x,
          data.position.y,
          data.position.z
        );

        // Update rotation
        remotePlayer.car.rotation.set(
          data.rotation.x,
          data.rotation.y,
          data.rotation.z
        );

        // Store speed and distance for potential use
        remotePlayer.speed = data.speed;
        remotePlayer.distance = data.distance;
      }
    });

    // Handle AI car updates
    this.socket.on("aiCarPositions", (data) => {
      this.updateAICars(data.aiCars);
    });

    // Handle race countdown
    this.socket.on("raceCountdown", () => {
      console.log("Race countdown started");

      // Show countdown UI
      if (typeof showCountdown === "function") {
        showCountdown();
      }
    });

    // Handle race start
    this.socket.on("raceStart", () => {
      console.log("Race started");

      // Start the race
      gameState.started = true;

      // Hide ready button
      const readyButton = document.getElementById("readyButton");
      if (readyButton) {
        readyButton.style.display = "none";
      }

      // Show race started message
      if (typeof showRaceStarted === "function") {
        showRaceStarted();
      }
    });

    // Handle race finished
    this.socket.on("raceFinished", (data) => {
      console.log("Race finished:", data);

      // Show race results
      if (typeof showRaceResults === "function") {
        showRaceResults(data.finishOrder);
      }
    });

    // Handle server errors
    this.socket.on("error", (error) => {
      console.error("Server error:", error);
      this.showConnectionStatus("error", "Server error: " + error.message);
    });

    // Handle disconnection
    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from server:", reason);
      this.connected = false;

      // Show disconnected status
      if (typeof showConnectionStatus === "function") {
        showConnectionStatus(
          "disconnected",
          "Disconnected from server: " + reason
        );
      }

      // Attempt to reconnect if it wasn't an intentional disconnect
      if (reason === "io server disconnect" || reason === "transport close") {
        this.attemptReconnect();
      }
    });

    // Handle AI cars being added
    this.socket.on("aiCarsAdded", (data) => {
      console.log("AI cars added:", data.aiCars);

      // Add each AI car to the game
      data.aiCars.forEach((aiCar) => {
        this.addAICarToScene(aiCar);
      });
    });

    // Handle AI car being removed (when replaced by a player)
    this.socket.on("aiCarRemoved", (data) => {
      console.log("AI car removed:", data.aiCarId);

      // Remove the AI car from the scene
      this.removeAICarFromScene(data.aiCarId);
    });
  }

  updatePlayerList(players) {
    console.log("Updating player list:", players);

    // Get current player IDs
    const currentPlayerIds = Object.keys(this.otherPlayers);

    // Get new player IDs
    const newPlayerIds = Object.keys(players).filter(
      (id) => id !== this.socket.id
    );

    // Find players to remove
    const playersToRemove = currentPlayerIds.filter(
      (id) => !newPlayerIds.includes(id)
    );

    // Remove players that left
    playersToRemove.forEach((id) => {
      this.removePlayer(id);
    });

    // Add new players
    newPlayerIds.forEach((id) => {
      if (!this.otherPlayers[id]) {
        this.addPlayer(id, players[id]);
      }
    });
  }

  addPlayer(id, playerData) {
    console.log(`Adding player: ${playerData.name} (${id})`);

    // Check if player already exists
    if (this.otherPlayers[id]) {
      console.warn(`Player ${id} already exists, removing first`);
      this.removePlayer(id);
    }

    // Create car for the player with a random color
    const colors = [0xff0000, 0x00ff00, 0xffff00, 0xff00ff, 0x00ffff, 0xff8000];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const car = createCar(randomColor, playerData.name);

    // Position the car at the server-assigned position
    if (playerData.position) {
      car.position.set(
        playerData.position.x,
        playerData.position.y,
        playerData.position.z
      );
      console.log(
        `Positioning player ${playerData.name} at server position:`,
        playerData.position
      );
    } else {
      // Fallback to default position if server didn't provide one
      const playerIndex = Object.keys(this.otherPlayers).length;
      car.position.set(playerIndex * 4 - 2, 0, -40);
      console.log(
        `Positioning player ${playerData.name} at fallback position:`,
        car.position
      );
    }

    // Store player data
    this.otherPlayers[id] = {
      id: id,
      name: playerData.name,
      car: car,
      distance: 0,
      finished: false,
    };

    // Add car to scene
    scene.add(car);

    console.log(
      `Added player ${playerData.name} with car at position:`,
      car.position
    );
  }

  updateOtherPlayer(data) {
    // Check if player exists
    if (!this.otherPlayers[data.id]) {
      console.warn(`Received position update for unknown player: ${data.id}`);
      return;
    }

    // Update existing player
    const player = this.otherPlayers[data.id];

    // Update position
    if (data.position) {
      player.car.position.set(
        data.position.x,
        data.position.y,
        data.position.z
      );
    }

    // Update rotation
    if (data.rotation) {
      player.car.rotation.set(
        data.rotation.x,
        data.rotation.y,
        data.rotation.z
      );
    }

    // Update distance
    if (data.distance !== undefined) {
      player.distance = data.distance;
    }

    // Update finished status
    if (data.finished !== undefined) {
      player.finished = data.finished;
    }

    // Debug output (occasional)
    if (Math.random() < 0.05) {
      console.log(
        `Other player ${
          player.name
        } position: x=${player.car.position.x.toFixed(
          2
        )}, z=${player.car.position.z.toFixed(2)}`
      );
    }
  }

  updateAICars(aiCarsData) {
    if (!aiCarsData || !Array.isArray(aiCarsData)) return;

    // Get current AI car IDs
    const currentAiIds = this.aiCars.map((car) => car.id);

    // Get new AI car IDs
    const newAiIds = aiCarsData.map((car) => car.id);

    // Remove AI cars that are no longer in the game
    currentAiIds.forEach((id) => {
      if (!newAiIds.includes(id)) {
        this.removeAICar(id);
      }
    });

    // Update or add AI cars
    aiCarsData.forEach((aiCarData) => {
      const existingAiCar = this.aiCars.find((car) => car.id === aiCarData.id);

      if (existingAiCar) {
        // Update existing AI car
        this.updateAICar(existingAiCar, aiCarData);
      } else {
        // Add new AI car
        this.addAICar(aiCarData);
      }
    });
  }

  addAICar(aiCarData) {
    console.log(`Adding AI car: ${aiCarData.name} (${aiCarData.id})`);

    // Create car for the AI
    const car = createCarForAI(aiCarData.name);

    // Store AI car data
    const aiCar = {
      id: aiCarData.id,
      name: aiCarData.name,
      car: car,
      distance: aiCarData.distance || 0,
      finished: aiCarData.finished || false,
    };

    this.aiCars.push(aiCar);

    // Add car to scene
    scene.add(car);

    console.log(`Added AI car ${aiCarData.name} with ID ${aiCarData.id}`);

    return aiCar;
  }

  updateAICar(aiCar, aiCarData) {
    if (!aiCar || !aiCar.car) return;

    // Update car position
    if (aiCarData.position) {
      aiCar.car.position.set(
        aiCarData.position.x,
        aiCarData.position.y,
        aiCarData.position.z
      );
    }

    // Update car rotation
    if (aiCarData.rotation) {
      aiCar.car.rotation.set(
        aiCarData.rotation.x,
        aiCarData.rotation.y,
        aiCarData.rotation.z
      );
    }

    // Update distance
    if (aiCarData.distance !== undefined) {
      aiCar.distance = aiCarData.distance;
    }

    // Update finished state
    if (aiCarData.finished !== undefined) {
      aiCar.finished = aiCarData.finished;
    }
  }

  removePlayer(id) {
    console.log(`Removing player: ${id}`);

    if (this.otherPlayers[id]) {
      // Remove car from scene
      scene.remove(this.otherPlayers[id].car);

      // Clean up THREE.js objects
      if (this.otherPlayers[id].car.geometry) {
        this.otherPlayers[id].car.geometry.dispose();
      }

      if (this.otherPlayers[id].car.material) {
        if (Array.isArray(this.otherPlayers[id].car.material)) {
          this.otherPlayers[id].car.material.forEach((material) =>
            material.dispose()
          );
        } else {
          this.otherPlayers[id].car.material.dispose();
        }
      }

      // Remove from otherPlayers
      delete this.otherPlayers[id];

      console.log(`Player ${id} removed`);
    }
  }

  removeAICar(id) {
    console.log(`Removing AI car: ${id}`);

    const aiCarIndex = this.aiCars.findIndex((car) => car.id === id);

    if (aiCarIndex !== -1) {
      const aiCar = this.aiCars[aiCarIndex];

      // Remove car from scene
      if (aiCar.car) {
        scene.remove(aiCar.car);

        // Dispose of geometries and materials
        if (aiCar.car.geometry) {
          aiCar.car.geometry.dispose();
        }

        if (aiCar.car.material) {
          if (Array.isArray(aiCar.car.material)) {
            aiCar.car.material.forEach((m) => m.dispose());
          } else {
            aiCar.car.material.dispose();
          }
        }
      }

      // Remove AI car from list
      this.aiCars.splice(aiCarIndex, 1);
      console.log(`Removed AI car ${id}`);
    }
  }

  sendPosition() {
    if (!this.socket || !this.connected || !playerCar) return;

    // Send position update to server
    this.socket.emit("updatePosition", {
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
      finished: gameState.finished,
    });
  }

  setReady() {
    if (this.connected && this.socket) {
      console.log("Sending player ready signal");
      this.socket.emit("playerReady");
    } else {
      console.error("Cannot set ready: not connected to server");
    }
  }

  disconnect() {
    if (this.socket) {
      console.log("Disconnecting from server");
      this.socket.disconnect();
      this.connected = false;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.showConnectionStatus(
        "error",
        "Failed to reconnect after multiple attempts"
      );
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    this.showConnectionStatus(
      "connecting",
      `Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    // Try to reconnect
    setTimeout(() => {
      this.initializeConnection(this.serverUrl, this.gameId, this.playerName);
    }, 2000);
  }

  checkConnection() {
    if (!this.socket) {
      console.error("Socket not initialized");
      return false;
    }

    console.log("Socket ID:", this.socket.id);
    console.log("Connected:", this.socket.connected);
    console.log("Game ID:", this.gameId);
    console.log("Player Name:", this.playerName);

    return this.socket.connected;
  }

  addAICarToScene(aiCar) {
    // Create a car model for the AI
    const aiCarModel = createCarModel(aiCar.id, true); // true indicates it's an AI car

    // Position the car according to the data from server
    aiCarModel.position.set(
      aiCar.position.x,
      aiCar.position.y,
      aiCar.position.z
    );

    // Add the car to the scene
    scene.add(aiCarModel);

    // Store the AI car in a collection for later reference
    this.aiCars.push({
      id: aiCar.id,
      name: aiCar.name,
      car: aiCarModel,
      distance: aiCar.distance,
      finished: aiCar.finished,
    });
  }

  removeAICarFromScene(aiCarId) {
    if (this.aiCars.find((car) => car.id === aiCarId)) {
      // Remove the car model from the scene
      scene.remove(this.aiCars.find((car) => car.id === aiCarId).car);

      // Clean up any resources
      if (this.aiCars.find((car) => car.id === aiCarId).car.geometry) {
        this.aiCars.find((car) => car.id === aiCarId).car.geometry.dispose();
      }

      if (this.aiCars.find((car) => car.id === aiCarId).car.material) {
        if (
          Array.isArray(
            this.aiCars.find((car) => car.id === aiCarId).car.material
          )
        ) {
          this.aiCars
            .find((car) => car.id === aiCarId)
            .car.material.forEach((material) => material.dispose());
        } else {
          this.aiCars.find((car) => car.id === aiCarId).car.material.dispose();
        }
      }

      // Remove from our collection
      this.aiCars = this.aiCars.filter((car) => car.id !== aiCarId);
    }
  }

  addRemotePlayerToScene(playerId, playerName, position) {
    // Create a car model for the remote player
    const playerCarModel = createCarModel(playerId, false); // false indicates it's not an AI car

    // Position the car according to the data from server
    playerCarModel.position.set(position.x, position.y, position.z);

    // Add the car to the scene
    scene.add(playerCarModel);

    // Store the remote player in a collection for later reference
    this.otherPlayers[playerId] = {
      id: playerId,
      name: playerName,
      car: playerCarModel,
      distance: 0,
      finished: false,
    };

    // Add player name label above the car
    addPlayerNameLabel(playerId, playerName, playerCarModel);
  }
}

// Helper function to create a car for a player
function createCarForPlayer(playerName) {
  console.log(`Creating car for player: ${playerName}`);

  // Create a simple car mesh
  const car = new THREE.Group();

  // Car body
  const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
  const bodyMaterial = new THREE.MeshLambertMaterial({
    color: getRandomColor(),
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.5;
  car.add(body);

  // Car roof
  const roofGeometry = new THREE.BoxGeometry(1.5, 0.7, 2);
  const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = 1.35;
  roof.position.z = -0.5;
  car.add(roof);

  // Wheels
  const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
  const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // Front left wheel
  const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelFL.rotation.z = Math.PI / 2;
  wheelFL.position.set(-1.1, 0.4, 1.2);
  car.add(wheelFL);

  // Front right wheel
  const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelFR.rotation.z = Math.PI / 2;
  wheelFR.position.set(1.1, 0.4, 1.2);
  car.add(wheelFR);

  // Rear left wheel
  const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelRL.rotation.z = Math.PI / 2;
  wheelRL.position.set(-1.1, 0.4, -1.2);
  car.add(wheelRL);

  // Rear right wheel
  const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelRR.rotation.z = Math.PI / 2;
  wheelRR.position.set(1.1, 0.4, -1.2);
  car.add(wheelRR);

  // Add player name label
  const nameLabel = createTextLabel(playerName);
  nameLabel.position.set(0, 2, 0);
  car.add(nameLabel);

  return car;
}

// Helper function to create a car for AI
function createCarForAI(aiName) {
  console.log(`Creating car for AI: ${aiName}`);

  // Create a simple car mesh (similar to player car but with different color)
  const car = new THREE.Group();

  // Car body
  const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 }); // Green for AI
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.5;
  car.add(body);

  // Car roof
  const roofGeometry = new THREE.BoxGeometry(1.5, 0.7, 2);
  const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = 1.35;
  roof.position.z = -0.5;
  car.add(roof);

  // Wheels
  const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
  const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // Front left wheel
  const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelFL.rotation.z = Math.PI / 2;
  wheelFL.position.set(-1.1, 0.4, 1.2);
  car.add(wheelFL);

  // Front right wheel
  const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelFR.rotation.z = Math.PI / 2;
  wheelFR.position.set(1.1, 0.4, 1.2);
  car.add(wheelFR);

  // Rear left wheel
  const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelRL.rotation.z = Math.PI / 2;
  wheelRL.position.set(-1.1, 0.4, -1.2);
  car.add(wheelRL);

  // Rear right wheel
  const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelRR.rotation.z = Math.PI / 2;
  wheelRR.position.set(1.1, 0.4, -1.2);
  car.add(wheelRR);

  // Add AI name label
  const nameLabel = createTextLabel(aiName);
  nameLabel.position.set(0, 2, 0);
  car.add(nameLabel);

  return car;
}

// Helper function to create a text label
function createTextLabel(text) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 256;
  canvas.height = 64;

  context.fillStyle = "rgba(0, 0, 0, 0.7)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = "24px Arial";
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 0.5, 1);

  return sprite;
}

// Helper function to get a random color
function getRandomColor() {
  const colors = [
    0xff0000, // Red
    0x0000ff, // Blue
    0xffff00, // Yellow
    0xff00ff, // Magenta
    0x00ffff, // Cyan
    0xff8000, // Orange
    0x8000ff, // Purple
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

// Helper function to create a car model for players or AI
function createCarModel(id, isAI) {
  console.log(`Creating car model for ${isAI ? "AI" : "player"}: ${id}`);

  // Create a car based on whether it's AI or player
  let car;

  if (isAI) {
    // AI cars are green
    car = createCarForAI(`AI ${id.split("-")[1]}`);
  } else {
    // Player cars get random colors
    car = createCarForPlayer(`Player ${id.substring(0, 4)}`);
  }

  // Add a property to identify this car
  car.userData = {
    id: id,
    isAI: isAI,
  };

  return car;
}

// Helper function to add a player name label above a car
function addPlayerNameLabel(playerId, playerName, carModel) {
  const nameLabel = createTextLabel(playerName);
  nameLabel.position.set(0, 2, 0);
  carModel.add(nameLabel);

  return nameLabel;
}

// Create global multiplayer instance
window.multiplayer = null;

// Debugging tools
window.debugMultiplayer = {
  getStatus: function () {
    if (!window.multiplayer || !window.multiplayer.socket) {
      return "Multiplayer not initialized";
    }

    return {
      connected: window.multiplayer.connected,
      socketId: window.multiplayer.socket.id,
      gameId: window.multiplayer.gameId,
      playerName: window.multiplayer.playerName,
      otherPlayers: Object.keys(window.multiplayer.otherPlayers).length,
      aiCars: window.multiplayer.aiCars.length,
    };
  },

  forceReconnect: function () {
    if (window.multiplayer) {
      window.multiplayer.reconnectAttempts = 0;
      window.multiplayer.attemptReconnect();
      return "Attempting to reconnect...";
    }
    return "Multiplayer not initialized";
  },

  listPlayers: function () {
    if (!window.multiplayer) return "Multiplayer not initialized";

    const players = Object.values(window.multiplayer.otherPlayers).map((p) => ({
      id: p.id,
      name: p.name,
      distance: p.distance || 0,
      finished: p.finished || false,
    }));

    return players;
  },
};

// Show the game UI
function showGameUI() {
  console.log("Showing game UI");

  // Show the game container
  const gameContainer = document.getElementById("gameContainer");
  if (gameContainer) {
    gameContainer.style.display = "block";
  }

  // Show the HUD
  const hud = document.getElementById("hud");
  if (hud) {
    hud.style.display = "block";
  }

  // Show the positions/leaderboard
  const positions = document.getElementById("positions");
  if (positions) {
    positions.style.display = "block";
  }
}

// Hide the lobby
function hideLobby() {
  console.log("Hiding lobby");

  // Hide the lobby container
  const lobbyContainer = document.getElementById("lobbyContainer");
  if (lobbyContainer) {
    lobbyContainer.style.display = "none";
  }
}

// Update camera position based on player car
function updateCameraPosition() {
  if (!playerCar || !camera) return;

  // Position camera behind the car
  const cameraOffset = new THREE.Vector3(0, 5, -10);
  cameraOffset.applyQuaternion(playerCar.quaternion);
  camera.position.copy(playerCar.position).add(cameraOffset);
  camera.lookAt(playerCar.position);
}
