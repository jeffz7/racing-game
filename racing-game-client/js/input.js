// Input handling

// Initialize player controls
function initPlayerControls() {
  // Set up keyboard controls
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  console.log("Player controls initialized");
}

// Handle key down events
function handleKeyDown(event) {
  switch (event.key.toLowerCase()) {
    case "w":
    case "arrowup":
      gameState.controls.accelerate = true;
      break;
    case "s":
    case "arrowdown":
      gameState.controls.brake = true;
      break;
    case "a":
    case "arrowleft":
      gameState.controls.turnLeft = true;
      break;
    case "d":
    case "arrowright":
      gameState.controls.turnRight = true;
      break;
    case "shift":
      gameState.controls.shiftUp = true;
      break;
    case "control":
      gameState.controls.shiftDown = true;
      break;
    case "c":
      // Toggle camera mode
      if (typeof toggleCameraMode === "function") {
        toggleCameraMode();
      }
      break;
  }
}

// Handle key up events
function handleKeyUp(event) {
  switch (event.key.toLowerCase()) {
    case "w":
    case "arrowup":
      gameState.controls.accelerate = false;
      break;
    case "s":
    case "arrowdown":
      gameState.controls.brake = false;
      break;
    case "a":
    case "arrowleft":
      gameState.controls.turnLeft = false;
      break;
    case "d":
    case "arrowright":
      gameState.controls.turnRight = false;
      break;
    case "shift":
      gameState.controls.shiftUp = false;
      break;
    case "control":
      gameState.controls.shiftDown = false;
      break;
  }
}

// Export functions
window.initPlayerControls = initPlayerControls;
