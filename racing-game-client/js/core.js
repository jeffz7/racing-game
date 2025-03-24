// Core game functionality - initialization and main loop

// Global variables
let lastTime = 0;

// Initialize the game
function init() {
  console.log("Initializing game...");

  // Reset game state
  gameState.reset();

  // Initialize player controls
  initPlayerControls();

  // Check if coming from lobby (multiplayer)
  const playerName = localStorage.getItem("playerName");
  const gameId = localStorage.getItem("gameId");
  const serverUrl = localStorage.getItem("serverUrl");

  console.log("Retrieved from localStorage:", {
    playerName,
    gameId,
    serverUrl,
  });

  // Create player car
  playerCar = createCar(0x0000ff, playerName || "YOU"); // Blue car

  // Position car at the start line
  playerCar.position.set(0, 0, 0); // Start line position

  scene.add(playerCar);
  console.log("Created player car and added to scene at start line");

  // Store reference to player car in window for debugging
  window.playerCar = playerCar;

  // Set initial gear to 1st
  gameState.currentGear = 1;

  if (playerName && gameId && serverUrl) {
    console.log("Initializing multiplayer mode");

    // Initialize multiplayer
    gameState.isMultiplayer = true;

    // Create multiplayer manager
    window.multiplayer = new MultiplayerManager(window);

    // Connect to server
    window.multiplayer.connect(serverUrl, gameId, playerName);

    // Show ready button
    showReadyButton();

    // Add a debug message to the UI
    showDebugMessage(`Multiplayer mode: ${playerName} in room ${gameId}`);
  } else {
    console.log("Initializing single player mode");

    // Single player mode - initialize AI cars
    initAICars();

    // Start the race immediately in single player mode
    gameState.started = true;

    // Show audio start overlay
    const audioStartOverlay = document.getElementById("audioStartOverlay");
    if (audioStartOverlay) {
      audioStartOverlay.style.display = "flex";
    }
  }

  // Load sounds
  if (typeof loadSounds === "function") {
    loadSounds();
  }

  // Start animation loop
  animate(0);

  console.log("Game initialized");
}

// Game loop
function animate(time) {
  requestAnimationFrame(animate);

  // Calculate delta time
  const deltaTime = lastTime ? (time - lastTime) / 1000 : 0.016;
  lastTime = time;

  // Cap delta time to prevent large jumps
  const cappedDeltaTime = Math.min(deltaTime, 0.1);

  // Update game
  update(cappedDeltaTime);

  // Render scene
  renderer.render(scene, camera);
}

// Update game state
function update(deltaTime) {
  // Update player car
  updatePlayerCar(deltaTime);

  // Update camera
  updateCamera();

  // Update AI cars in single player mode
  if (!gameState.isMultiplayer && window.aiCars) {
    updateAICars(deltaTime);
  }

  // Update multiplayer
  if (gameState.isMultiplayer && window.multiplayer) {
    // Send position updates to server
    window.multiplayer.sendPosition();
  }

  // Update UI
  updateSpeedometer();
  updateTachometer();
  updateGearIndicator();
  updateLeaderboard();

  // Update animated objects
  if (typeof updateAnimatedObjects === "function") {
    updateAnimatedObjects(deltaTime);
  }
}

// Finish race
function finishRace() {
  console.log("Race finished!");

  gameState.finished = true;

  // Show finish message
  showFinishMessage();

  // Send finish event to server in multiplayer mode
  if (
    gameState.isMultiplayer &&
    window.multiplayer &&
    window.multiplayer.socket
  ) {
    window.multiplayer.socket.emit("playerFinished", {
      time: Date.now() - gameState.raceStartTime,
    });
  }
}

// Helper function to show debug message
function showDebugMessage(message) {
  const debugMsg = document.createElement("div");
  debugMsg.style.position = "absolute";
  debugMsg.style.top = "10px";
  debugMsg.style.left = "10px";
  debugMsg.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  debugMsg.style.color = "white";
  debugMsg.style.padding = "10px";
  debugMsg.style.borderRadius = "5px";
  debugMsg.textContent = message;
  document.body.appendChild(debugMsg);
}

// Initialize the game when the page loads
window.addEventListener("load", init);

// Export functions
window.finishRace = finishRace;
