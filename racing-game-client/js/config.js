// Game configuration
const config = {
  // Car physics
  carSpeed: 0.5, // Maximum car speed
  acceleration: 0.005, // Acceleration rate
  deceleration: 0.002, // Natural deceleration (friction)
  brakeForce: 0.01, // Braking force
  carWidth: 4, // Width of car for collision detection

  // Track settings
  trackWidth: 18, // Width of the track (suitable for 3 cars side by side)
  trackLength: 1000, // Length of the track

  // AI settings
  aiCars: 4, // Number of AI cars (4 AI + 1 player = 5 total)
  aiSpeed: 0.45, // Base AI car speed

  // Collision settings
  collisionForce: 0.5, // How much a collision slows the car

  // Physics settings
  physics: {
    inertia: 0.92, // How quickly car reaches target speed (0-1, higher = more inertia)
    grip: 0.7, // How well car grips the road (0-1, higher = more grip)

    // Gear efficiency (how effective each gear is)
    gearEfficiency: {
      "-1": 0.5, // Reverse
      0: 0, // Neutral
      1: 0.8, // 1st gear
      2: 0.9, // 2nd gear
      3: 1.0, // 3rd gear
      4: 0.95, // 4th gear
      5: 0.9, // 5th gear
    },

    // Speed limits for each gear (as fraction of max speed)
    speedLimits: {
      "-1": 0.2, // Reverse
      0: 0, // Neutral
      1: 0.2, // 1st gear
      2: 0.4, // 2nd gear
      3: 0.6, // 3rd gear
      4: 0.8, // 4th gear
      5: 1.0, // 5th gear
    },
    gearChangeTime: 500, // Time in ms to change gears
  },

  // Gear change settings
  gears: {
    changeTime: 500, // Time to change gears (ms)
  },

  // Race finish settings
  finish: {
    raceDistance: 1000, // Distance to finish line
    decelerationDistance: 50, // Distance after finish line where cars slow down
    stopDistance: 100, // Distance after finish line where cars stop completely
  },
};

// Input state
// let keysPressed = {
//   ArrowUp: false,
//   ArrowDown: false,
//   ArrowLeft: false,
//   ArrowRight: false,
// };

// Mobile touch state
let touchControls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

// Game elements
// let scene,
//   camera,
//   renderer,
//   playerCar,
//   aiCars = [],
//   track;

// Define global constants for easier access
const RACE_DISTANCE = config.finish.raceDistance;
const FINISH_DECELERATION_DISTANCE = config.finish.decelerationDistance;
const FINISH_STOP_DISTANCE = config.finish.stopDistance;

// Any configuration functions can now use the global gameState
function initializeGameConfig() {
  // You can still set specific config values here if needed
  gameState.finishDistance = config.finish.raceDistance; // meters to finish line

  // Other configuration...
}
