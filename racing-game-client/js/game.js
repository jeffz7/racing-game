// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById("gameContainer").appendChild(renderer.domElement);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add directional light (sun)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Create track
createTrack();

// Initialize the global aiCars array
window.aiCars = [];

// Create player car
const playerCar = createCar(0x0000ff, "YOU"); // Blue car with "YOU" on the roof
scene.add(playerCar);

// Initialize AI cars (this will also position the player car)
initAICars();

// Game state
// const gameState = {
//   speed: 0,
//   maxSpeed: 0,
//   acceleration: 0,
//   currentGear: 0,
//   targetGear: 0,
//   isChangingGear: false,
//   gearChangeStart: 0,
//   rpm: 0,
//   wheelspin: 0,
//   started: false,
//   finished: false,
//   startTime: 0,
//   currentTime: 0,
//   finishTime: 0,
// };

// Track key presses
const keysPressed = {};
document.addEventListener("keydown", (e) => {
  keysPressed[e.code] = true;

  // Horn on H key
  if (e.code === "KeyH") {
    playSound("horn");
  }
});
document.addEventListener("keyup", (e) => {
  keysPressed[e.code] = false;
});

// Handle mobile controls
document
  .getElementById("upBtn")
  .addEventListener("touchstart", () => (keysPressed.ArrowUp = true));
document
  .getElementById("downBtn")
  .addEventListener("touchstart", () => (keysPressed.ArrowDown = true));
document
  .getElementById("leftBtn")
  .addEventListener("touchstart", () => (keysPressed.ArrowLeft = true));
document
  .getElementById("rightBtn")
  .addEventListener("touchstart", () => (keysPressed.ArrowRight = true));

document
  .getElementById("upBtn")
  .addEventListener("touchend", () => (keysPressed.ArrowUp = false));
document
  .getElementById("downBtn")
  .addEventListener("touchend", () => (keysPressed.ArrowDown = false));
document
  .getElementById("leftBtn")
  .addEventListener("touchend", () => (keysPressed.ArrowLeft = false));
document
  .getElementById("rightBtn")
  .addEventListener("touchend", () => (keysPressed.ArrowRight = false));

// Start audio context on user interaction
document.getElementById("startAudioBtn").addEventListener("click", () => {
  document.getElementById("audioStartOverlay").style.display = "none";
  initAudio();
  animate();
});

// Restart button
document.getElementById("restartBtn").addEventListener("click", () => {
  location.reload();
});

// Game loop
function animate() {
  requestAnimationFrame(animate);

  // Update player car
  updatePlayerCar();

  // Update AI cars
  updateAICars();

  // Update camera to follow player
  updateCamera();

  // Update HUD
  updateHUD();

  // Render scene
  renderer.render(scene, camera);
}

// Update camera to follow player car
function updateCamera() {
  // Base camera position
  const cameraHeight = 10;
  const cameraDistance = 15;

  // Position camera behind car
  const cameraPosition = new THREE.Vector3();
  cameraPosition.copy(playerCar.position);
  cameraPosition.y += cameraHeight;
  cameraPosition.z -= cameraDistance;

  camera.position.copy(cameraPosition);

  // Look at car
  camera.lookAt(playerCar.position);

  // Ensure camera up vector is always (0,1,0) to prevent rolling
  camera.up.set(0, 1, 0);
}

// Start the race
function startRace() {
  gameState.started = true;
  gameState.startTime = Date.now();
  console.log("Race started!");

  // Play start sound if available
  if (typeof playSound === "function") {
    playSound("acceleration", { volume: 0.5 });
  }
}

// Initialize the game
function init() {
  // Show audio start overlay
  document.getElementById("audioStartOverlay").style.display = "flex";

  // Load sounds
  if (typeof loadSounds === "function") {
    loadSounds();
  }

  console.log("Game initialized");
}

// Start the game
init();
animate();
