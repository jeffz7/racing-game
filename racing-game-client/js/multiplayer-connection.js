// Multiplayer connection manager

class MultiplayerConnectionManager {
  constructor(manager) {
    console.log("Creating multiplayer connection manager");
    this.manager = manager;
    this.socket = null;
    this.serverUrl = null;
    this.gameId = null;
    this.playerName = null;
  }

  connect(serverUrl, gameId, playerName) {
    console.log(
      `Connecting to server ${serverUrl} for game ${gameId} as ${playerName}`
    );

    // Store connection info
    this.serverUrl = serverUrl;
    this.gameId = gameId;
    this.playerName = playerName;

    // Connect to server
    this.socket = io(serverUrl);

    // Set up event handlers
    this.setupEventHandlers();

    // Join game when connected
    this.socket.on("connect", () => {
      console.log("Connected to server, joining game");

      // Join game
      this.socket.emit("joinGame", {
        gameId: this.gameId,
        playerName: this.playerName,
      });

      // Notify manager that socket is connected
      if (typeof this.manager.onSocketConnected === "function") {
        this.manager.onSocketConnected();
      }
    });
  }

  setupEventHandlers() {
    if (!this.socket) {
      console.error("Cannot setup event handlers: socket is null");
      return;
    }

    // Connection status events
    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      showConnectionStatus("error", "Connection error: " + error.message);
    });

    this.socket.on("connect_timeout", () => {
      console.error("Connection timeout");
      showConnectionStatus("error", "Connection timeout");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
      showConnectionStatus("warning", "Disconnected: " + reason);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("Reconnected after", attemptNumber, "attempts");
      showConnectionStatus("success", "Reconnected");

      // Rejoin game
      this.socket.emit("joinGame", {
        gameId: this.gameId,
        playerName: this.playerName,
      });
    });

    // Game events
    this.socket.on("gameJoined", (data) => {
      console.log("Joined game:", data);

      // Update host status
      this.manager.isHost = data.isHost;
      localStorage.setItem("isHost", data.isHost);

      // Show notification
      showConnectionStatus(
        "success",
        `Joined game ${data.gameId} as ${data.playerName}${
          data.isHost ? " (Host)" : ""
        }`
      );

      // Show ready button
      document.getElementById("ready-button").style.display = "block";

      // Update player list
      if (this.manager.playersManager) {
        this.manager.playersManager.updatePlayerList(data.players);
      }
    });

    this.socket.on("playerJoined", (data) => {
      console.log("Player joined:", data);

      // Show notification
      showConnectionStatus("info", `${data.playerName} joined the game`);

      // Update player list
      if (this.manager.playersManager) {
        this.manager.playersManager.updatePlayerList(data.players);
      }
    });

    this.socket.on("playerLeft", (data) => {
      console.log("Player left:", data);

      // Show notification
      showConnectionStatus("info", `${data.playerName} left the game`);

      // Update player list
      if (this.manager.playersManager) {
        this.manager.playersManager.updatePlayerList(data.players);
      }
    });

    this.socket.on("playerReady", (data) => {
      console.log("Player ready:", data);

      // Show notification
      showConnectionStatus("info", `${data.playerName} is ready`);
    });

    this.socket.on("gameStarting", (data) => {
      console.log("Game starting:", data);

      // Show notification
      showConnectionStatus(
        "success",
        `Game starting in ${data.countdown} seconds`
      );

      // Show countdown
      showCountdown(data.countdown);
    });

    this.socket.on("gameStarted", () => {
      console.log("Game started");

      // Show notification
      showConnectionStatus("success", "Game started");

      // Start game
      gameState.started = true;

      // Hide ready button
      document.getElementById("ready-button").style.display = "none";
    });

    this.socket.on("playerPosition", (data) => {
      // Update other player position
      if (this.manager.playersManager) {
        this.manager.playersManager.updatePlayerPosition(
          data.playerId,
          data.position,
          data.speed
        );
      }
    });

    this.socket.on("playerFinished", (data) => {
      console.log("Player finished:", data);

      // Show notification
      showConnectionStatus(
        "info",
        `${data.playerName} finished in position ${data.position}`
      );

      // Update positions display
      updatePositionsDisplay(data.positions);
    });

    // Handle AI cars added
    this.socket.on("aiCarsAdded", (data) => {
      console.log(`Added ${data.count} AI cars`);

      // Show notification
      showConnectionStatus("info", `Added ${data.count} AI cars`);
    });
  }

  addAICars(count = 1) {
    if (!this.socket) {
      console.error("Cannot add AI cars: not connected to server");
      return;
    }

    if (!this.manager.isHost) {
      console.error("Only host can add AI cars");
      return;
    }

    console.log(`Requesting to add ${count} AI cars`);
    this.socket.emit("addAICars", { count });
  }
}

// Make sure the class is defined globally
window.MultiplayerConnectionManager = MultiplayerConnectionManager;

// Log to confirm it's defined
console.log(
  "MultiplayerConnectionManager defined:",
  typeof window.MultiplayerConnectionManager
);
