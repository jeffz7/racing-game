// Initialize Three.js objects before anything else
console.log("Initializing Three.js objects");

// Create scene
window.scene = new THREE.Scene();

// Create camera
window.camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
window.camera.position.set(0, 5, -10);
window.camera.lookAt(0, 0, 0);

// Create renderer
window.renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("game-canvas"),
  antialias: true,
});
window.renderer.setSize(window.innerWidth, window.innerHeight);
window.renderer.setClearColor(0x87ceeb); // Sky blue background
window.renderer.shadowMap.enabled = true;

// Handle window resize
window.addEventListener("resize", () => {
  window.camera.aspect = window.innerWidth / window.innerHeight;
  window.camera.updateProjectionMatrix();
  window.renderer.setSize(window.innerWidth, window.innerHeight);
});

// Log to confirm objects are defined
console.log("Three.js objects initialized:");
console.log("- scene:", typeof window.scene);
console.log("- camera:", typeof window.camera);
console.log("- renderer:", typeof window.renderer);
