// Input handling

// Input state
const inputState = {
  accelerator: 0,
  brake: 0,
  steering: 0,
  keys: {},
};

// Initialize player controls
function initPlayerControls() {
  console.log("Player controls initialized");

  // Add keyboard event listeners
  window.addEventListener("keydown", (event) => {
    inputState.keys[event.code] = true;
  });

  window.addEventListener("keyup", (event) => {
    inputState.keys[event.code] = false;
  });
}

// Get accelerator input (0 to 1)
function getAcceleratorInput() {
  // Check for up arrow or W key
  if (inputState.keys["ArrowUp"] || inputState.keys["KeyW"]) {
    inputState.accelerator = Math.min(inputState.accelerator + 0.05, 1);
  } else {
    inputState.accelerator = Math.max(inputState.accelerator - 0.1, 0);
  }

  return inputState.accelerator;
}

// Get brake input (0 to 1)
function getBrakeInput() {
  // Check for down arrow or S key
  if (inputState.keys["ArrowDown"] || inputState.keys["KeyS"]) {
    inputState.brake = Math.min(inputState.brake + 0.1, 1);
  } else {
    inputState.brake = Math.max(inputState.brake - 0.1, 0);
  }

  return inputState.brake;
}

// Get steering input (-1 to 1)
function getSteeringInput() {
  // Check for left/right arrows or A/D keys
  if (inputState.keys["ArrowLeft"] || inputState.keys["KeyA"]) {
    inputState.steering = Math.max(inputState.steering - 0.1, -1);
  } else if (inputState.keys["ArrowRight"] || inputState.keys["KeyD"]) {
    inputState.steering = Math.min(inputState.steering + 0.1, 1);
  } else {
    // Return to center
    if (inputState.steering > 0) {
      inputState.steering = Math.max(inputState.steering - 0.1, 0);
    } else if (inputState.steering < 0) {
      inputState.steering = Math.min(inputState.steering + 0.1, 0);
    }
  }

  return inputState.steering;
}

// Export functions
window.initPlayerControls = initPlayerControls;
window.getAcceleratorInput = getAcceleratorInput;
window.getBrakeInput = getBrakeInput;
window.getSteeringInput = getSteeringInput;

// Initialize input
function initInput() {
  console.log("Initializing input");

  // Set up keyboard event listeners
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  console.log("Input initialized");
}

// Handle key down events
function handleKeyDown(event) {
  switch (event.key) {
    case "ArrowUp":
    case "w":
      gameState.accelerating = true;
      gameState.braking = false;
      break;
    case "ArrowDown":
    case "s":
      gameState.braking = true;
      gameState.accelerating = false;
      break;
    case "ArrowLeft":
    case "a":
      gameState.turningLeft = true;
      gameState.turningRight = false;
      break;
    case "ArrowRight":
    case "d":
      gameState.turningRight = true;
      gameState.turningLeft = false;
      break;
    case " ":
      // Space bar - handbrake
      gameState.handbrake = true;
      break;
  }
}

// Handle key up events
function handleKeyUp(event) {
  switch (event.key) {
    case "ArrowUp":
    case "w":
      gameState.accelerating = false;
      break;
    case "ArrowDown":
    case "s":
      gameState.braking = false;
      break;
    case "ArrowLeft":
    case "a":
      gameState.turningLeft = false;
      break;
    case "ArrowRight":
    case "d":
      gameState.turningRight = false;
      break;
    case " ":
      // Space bar - handbrake
      gameState.handbrake = false;
      break;
  }
}

// Export functions to global scope
window.initInput = initInput;
window.handleKeyDown = handleKeyDown;
window.handleKeyUp = handleKeyUp;

// Log to confirm they're defined
console.log("Input functions defined:");
console.log("- initInput:", typeof window.initInput);
console.log("- handleKeyDown:", typeof window.handleKeyDown);
console.log("- handleKeyUp:", typeof window.handleKeyUp);
