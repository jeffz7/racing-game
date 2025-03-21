// Main multiplayer manager - orchestrates the other modules

class MultiplayerManager {
  constructor() {
    console.log("Creating multiplayer manager");

    this.players = [];
    this.isHost = false;
    this.isReady = false;
    this.gameStarted = false;

    // Create connection manager
    this.connection = new MultiplayerConnectionManager(this);

    // Create players manager
    this.playersManager = new MultiplayerPlayersManager(this);

    // Create sync manager
    this.syncManager = new MultiplayerSyncManager(this);

    // AI manager will be created after socket is connected
    this.aiManager = null;
  }

  connect(serverUrl, gameId, playerName) {
    console.log(
      `Connecting to server ${serverUrl} for game ${gameId} as ${playerName}`
    );

    // Connect to server
    this.connection.connect(serverUrl, gameId, playerName);

    // Store game ID and player name
    this.gameId = gameId;
    this.playerName = playerName;

    // Determine if host based on localStorage
    this.isHost = localStorage.getItem("isHost") === "true";
    console.log(`Is host (from localStorage): ${this.isHost}`);
  }

  // This method will be called after socket is connected
  onSocketConnected() {
    console.log("Socket connected, creating AI manager");

    // Create AI manager now that socket is connected
    if (typeof MultiplayerAIManager === "function") {
      this.aiManager = new MultiplayerAIManager(this);
    } else {
      console.error("MultiplayerAIManager is not defined");
    }
  }

  setReady() {
    console.log("Setting player as ready");

    if (!this.connection || !this.connection.socket) {
      console.error("Cannot set ready: not connected to server");
      return;
    }

    this.isReady = true;
    this.connection.socket.emit("playerReady");
  }

  startGame() {
    console.log("Starting game");

    if (!this.connection || !this.connection.socket) {
      console.error("Cannot start game: not connected to server");
      return;
    }

    if (!this.isHost) {
      console.error("Only host can start game");
      return;
    }

    this.connection.socket.emit("startGame");
  }

  updateAiCars(deltaTime) {
    if (this.aiManager) {
      this.aiManager.updateAICars(deltaTime);
    }
  }

  // Add the missing sendPosition method
  sendPosition(force = false) {
    // Forward to sync manager
    if (this.syncManager) {
      this.syncManager.sendPlayerPosition(force);
    }
  }
}

// Make sure the class is defined globally
window.MultiplayerManager = MultiplayerManager;

// Log to confirm it's defined
console.log("MultiplayerManager defined:", typeof window.MultiplayerManager);
