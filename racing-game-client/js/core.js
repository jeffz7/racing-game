// Core game functionality - initialization and main loop

// Global variables
let playerCar;
let lastTime = 0;

// Initialize the game
function init() {
  console.log("Initializing game");

  // Create track
  if (window.createTrack) {
    window.createTrack();
  } else {
    console.error("createTrack function not found");
  }

  // Add environment objects
  if (window.addEnvironmentObjects) {
    window.addEnvironmentObjects();
  }

  // Create player car
  if (window.createPlayerCar) {
    window.createPlayerCar();
  } else {
    console.error("createPlayerCar function not found");
  }

  // Initialize physics
  if (window.initPhysics) {
    window.initPhysics();
  } else {
    console.error("initPhysics function not found");
  }

  // Initialize input
  if (window.initInput) {
    window.initInput();
  } else {
    console.error("initInput function not found");
  }

  // Initialize UI
  if (window.initUI) {
    window.initUI();
  } else {
    console.warn("initUI function not found");
  }

  // Start animation loop
  animate();

  console.log("Game initialized");
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Get game parameters from URL or localStorage
function getGameParams() {
  // Check localStorage first
  const playerName = localStorage.getItem("playerName");
  const gameId = localStorage.getItem("gameId");
  const serverUrl = localStorage.getItem("serverUrl");
  const createdGameId = localStorage.getItem("createdGameId");
  const isHost = localStorage.getItem("isHost") === "true";

  return {
    playerName,
    gameId,
    serverUrl,
    createdGameId,
    isHost,
  };
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Check if scene, camera, and renderer exist
  if (!window.scene || !window.camera || !window.renderer) {
    console.error("Cannot render: renderer, scene, or camera is undefined");
    return;
  }

  // Update game state
  update();

  // Render scene
  window.renderer.render(window.scene, window.camera);
}

// Update game state
function update() {
  // Update physics
  if (window.updatePhysics) {
    window.updatePhysics();
  }

  // Update car
  if (window.updateCar && window.playerCar) {
    window.updateCar(window.playerCar);
  }

  // Update car wheels
  if (window.updateCarWheels && window.playerCar) {
    window.updateCarWheels(window.playerCar);
  }

  // Update camera
  if (window.updateCamera && window.playerCar) {
    window.updateCamera(window.playerCar);
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

function updatePlayerCar(deltaTime) {
  // Don't update if player has finished
  if (gameState.finished) {
    return;
  }

  // For multiplayer, only allow movement if race has started or countdown is active
  if (gameState.isMultiplayer) {
    if (!gameState.started && !gameState.countdown) {
      return;
    }
  }

  // Get input values
  const accelerator = getAcceleratorInput();
  const brake = getBrakeInput();
  const steering = getSteeringInput();

  // Apply physics
  const physics = calculateCarPhysics(accelerator, brake, steering, deltaTime);

  // Update car position
  playerCar.position.z -= physics.forwardVelocity * deltaTime;
  playerCar.position.x += physics.lateralVelocity * deltaTime;

  // Update car rotation
  playerCar.rotation.y = steering * 0.5;

  // Update wheels
  updateCarWheels(playerCar, gameState.speed);

  // Update game state
  gameState.speed = physics.speed;
  gameState.rpm = physics.rpm;
  gameState.distance += physics.forwardVelocity * deltaTime;
  gameState.currentGear = physics.gear;

  // Check for finish
  if (gameState.distance >= gameState.finishDistance && !gameState.finished) {
    finishRace();
  }

  // Update engine sound
  if (typeof updateEngineSound === "function") {
    updateEngineSound(gameState.rpm, accelerator);
  }

  // Play tire squeal sound if drifting
  if (
    typeof playTireSquealSound === "function" &&
    Math.abs(physics.lateralVelocity) > 0.5
  ) {
    playTireSquealSound(Math.abs(physics.lateralVelocity) / 2);
  }
}

// Update camera
function updateCamera(car) {
  if (!car || !window.camera) return;

  // Position camera behind car
  const cameraOffset = new THREE.Vector3(0, 5, 10);
  const cameraTarget = new THREE.Vector3(
    car.position.x,
    car.position.y,
    car.position.z
  );

  // Apply offset
  window.camera.position.x = cameraTarget.x + cameraOffset.x;
  window.camera.position.y = cameraTarget.y + cameraOffset.y;
  window.camera.position.z = cameraTarget.z + cameraOffset.z;

  // Look at car
  window.camera.lookAt(cameraTarget);
}

// Export functions
window.animate = animate;
window.update = update;
window.init = init;

// Log to confirm they're defined
console.log("Core functions defined:");
console.log("- animate:", typeof window.animate);
console.log("- update:", typeof window.update);
console.log("- init:", typeof window.init);
