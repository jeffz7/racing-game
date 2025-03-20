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
};

// Game state
const gameState = {
  started: false,
  finished: false,
  speed: 0, // Current speed
  targetSpeed: 0, // Target speed based on physics
  acceleration: 0, // Current acceleration
  maxSpeed: 0, // Maximum speed reached
  checkpoint: 0,
  startTime: null,
  endTime: null,
  currentTime: 0,
  currentGear: 0, // Current gear (0 = neutral)
  targetGear: 0, // Target gear when changing
  gearChangeStart: 0, // When gear change started
  isChangingGear: false, // Whether currently changing gear
  rpm: 0, // Engine RPM (0-100%)
  wheelspin: 0, // Amount of wheelspin (0-1)
  steering: 0, // Current steering angle
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
