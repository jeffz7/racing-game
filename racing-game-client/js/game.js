// Main game file - central entry point

// Global variables
let playerCar;

// This file now serves as a central point to load all modules
// The actual functionality has been moved to specialized modules:
// - core.js: Game initialization and main loop
// - physics.js: Car physics and movement
// - camera.js: Camera management
// - ui.js: UI elements and display
// - input.js: Input handling
// - multiplayer.js: Multiplayer functionality

// Make sure all required modules are loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check that all required modules are loaded
  const requiredModules = [
    "initPlayerControls", // from input.js
    "updateCamera", // from camera.js
    "updatePlayerCar", // from physics.js
    "updateSpeedometer", // from ui.js
    "showCountdown", // from ui.js
    "animate", // from core.js
  ];

  const missingModules = requiredModules.filter(
    (module) => typeof window[module] !== "function"
  );

  if (missingModules.length > 0) {
    console.error("Missing required modules:", missingModules);
    alert(
      "Game initialization failed: Missing required modules. Check console for details."
    );
  } else {
    console.log("All game modules loaded successfully");
  }
});

console.log("Game entry point loaded");
