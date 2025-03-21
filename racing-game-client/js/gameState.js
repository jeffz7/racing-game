// Central game state management
window.gameState = {
  // Player state
  speed: 0,
  rpm: 0,
  distance: 0,
  currentGear: 1,

  // Race state
  started: false,
  readyToStart: false, // New flag to track if player is ready
  countdown: false, // New flag to track if countdown is active
  finished: false,
  raceStartTime: 0,

  // Game settings
  finishDistance: 1000,
  isMultiplayer: false,

  // Car physics
  acceleration: 0,
  throttle: 0,
  brakeForce: 0,
  steeringAngle: 0,
  maxSteeringAngle: 0.05,
  mass: 1000,

  // Engine
  maxRPM: 8000,
  idleRPM: 800,
  redlineRPM: 7500,
  maxEnginePower: 300,

  // Transmission
  gearRatios: [2.66, 1.78, 1.3, 1.0, 0.74, 0.5], // Reverse, 1st, 2nd, 3rd, 4th, 5th
  isChangingGear: false,
  gearChangeStart: 0,

  // Controls
  controls: {
    accelerate: false,
    brake: false,
    turnLeft: false,
    turnRight: false,
    shiftUp: false,
    shiftDown: false,
  },

  // Sounds
  sounds: {},

  // Reset game state
  reset() {
    this.speed = 0;
    this.rpm = 0;
    this.distance = 0;
    this.currentGear = 1;

    this.started = false;
    this.readyToStart = false;
    this.countdown = false;
    this.finished = false;
    this.raceStartTime = 0;

    this.acceleration = 0;
    this.throttle = 0;
    this.brakeForce = 0;
    this.steeringAngle = 0;

    this.isChangingGear = false;
    this.gearChangeStart = 0;

    this.controls = {
      accelerate: false,
      brake: false,
      turnLeft: false,
      turnRight: false,
      shiftUp: false,
      shiftDown: false,
    };

    console.log("Game state reset with gear set to 1st");
  },
};
