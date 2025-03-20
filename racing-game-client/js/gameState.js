// Central game state management
window.gameState = {
  // Game state
  started: false,
  finished: false,
  isMultiplayer: false,

  // Car physics
  speed: 0,
  acceleration: 0,
  throttle: 0,
  brakeForce: 0,
  steeringAngle: 0,
  maxSteeringAngle: 0.05,
  mass: 1000,

  // Engine
  rpm: 800,
  maxRPM: 8000,
  idleRPM: 800,
  redlineRPM: 7500,
  maxEnginePower: 300,

  // Transmission
  currentGear: 0, // 0 = neutral, -1 = reverse, 1+ = forward gears
  gearRatios: [2.66, 1.78, 1.3, 1.0, 0.74, 0.5], // Reverse, 1st, 2nd, 3rd, 4th, 5th
  isChangingGear: false,
  gearChangeStart: 0,

  // Race
  distance: 0,
  finishDistance: 1000, // Distance to finish line

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
  reset: function () {
    this.started = false;
    this.finished = false;

    this.speed = 0;
    this.acceleration = 0;
    this.throttle = 0;
    this.brakeForce = 0;
    this.steeringAngle = 0;

    this.rpm = this.idleRPM;

    this.currentGear = 1;
    this.isChangingGear = false;

    this.distance = 0;

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
