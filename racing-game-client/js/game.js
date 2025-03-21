// Main game file - central entry point

// Global variables
// This file should not declare playerCar again if it's already declared in core.js
// Remove or comment out any duplicate declarations

// This file now serves as a central point to load all modules
// The actual functionality has been moved to specialized modules:
// - core.js: Game initialization and main loop
// - physics.js: Car physics and movement
// - camera.js: Camera management
// - ui.js: UI elements and display
// - input.js: Input handling
// - multiplayer.js: Multiplayer functionality

// Required modules
const requiredModules = [
  "scene",
  "camera",
  "renderer",
  "createTrack",
  "createPlayerCar",
  "updateCar",
  "updateCamera",
  "initPhysics",
  "updatePhysics",
  "initInput",
];

// Game state
const gameState = {
  speed: 0,
  rpm: 0,
  distance: 0,
  currentGear: 1,
  started: false,
  finished: false,
  time: 0,
  bestTime: localStorage.getItem("bestTime") || 0,
};

// Log that game entry point is loaded
console.log("Game entry point loaded");

// Check if all required modules are loaded
function checkRequiredModules() {
  const missingModules = [];

  for (const module of requiredModules) {
    if (!window[module]) {
      console.error("Missing module:", module);
      missingModules.push(module);
    }
  }

  if (missingModules.length > 0) {
    console.log("Missing required modules: ", missingModules);
    return false;
  }

  return true;
}

// Try to initialize game
let initAttempts = 0;
const maxInitAttempts = 10;

function tryInitialize() {
  initAttempts++;
  console.log(`Initialization attempt ${initAttempts}/${maxInitAttempts}`);

  if (checkRequiredModules()) {
    console.log("All required modules loaded, initializing game");
    window.init();
    console.log("Initializing game with state:", gameState);
    return true;
  } else {
    if (initAttempts < maxInitAttempts) {
      console.log("Missing some required modules, retrying in 200ms...");
      setTimeout(tryInitialize, 200);
    } else {
      console.error(
        "Failed to initialize game after",
        maxInitAttempts,
        "attempts"
      );
    }
    return false;
  }
}

// Initialize game when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, checking required modules");
  setTimeout(tryInitialize, 100);
});

// Log that all game modules are loaded successfully
console.log("All game modules loaded successfully");
