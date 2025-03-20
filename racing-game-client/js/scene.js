// Complete overhaul of the 3D scene

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

// Create camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 10); // Position camera above and behind the starting position
camera.lookAt(0, 0, -50); // Look toward the track

// Create renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add directional light (sun)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 0);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Create ground
const groundGeometry = new THREE.PlaneGeometry(100, 1000);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x1e8449, // Green
  roughness: 0.8,
  metalness: 0.2,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
ground.position.z = -400; // Center the track
ground.receiveShadow = true;
scene.add(ground);

// Create track
const trackGeometry = new THREE.PlaneGeometry(20, 1000);
const trackMaterial = new THREE.MeshStandardMaterial({
  color: 0x333333, // Dark gray
  roughness: 0.5,
  metalness: 0.3,
});
const track = new THREE.Mesh(trackGeometry, trackMaterial);
track.rotation.x = -Math.PI / 2; // Rotate to be horizontal
track.position.y = 0.01; // Slightly above ground to prevent z-fighting
track.position.z = -400; // Center the track
track.receiveShadow = true;
scene.add(track);

// Create start line
const startLineGeometry = new THREE.PlaneGeometry(20, 2);
const startLineMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff, // White
  roughness: 0.5,
  metalness: 0.3,
});
const startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
startLine.rotation.x = -Math.PI / 2; // Rotate to be horizontal
startLine.position.y = 0.02; // Slightly above track
startLine.position.z = 0; // Start line at z=0
startLine.receiveShadow = true;
scene.add(startLine);

// Create finish line
const finishLineGeometry = new THREE.PlaneGeometry(20, 2);
const finishLineMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff, // White
  roughness: 0.5,
  metalness: 0.3,
});
const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
finishLine.rotation.x = -Math.PI / 2; // Rotate to be horizontal
finishLine.position.y = 0.02; // Slightly above track
finishLine.position.z = -800; // Finish line at z=-800
finishLine.receiveShadow = true;
scene.add(finishLine);

// Add track markers every 100 units
for (let i = 100; i < 800; i += 100) {
  const markerGeometry = new THREE.PlaneGeometry(20, 1);
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, // White
    roughness: 0.5,
    metalness: 0.3,
  });
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  marker.position.y = 0.02; // Slightly above track
  marker.position.z = -i; // Position along track
  marker.receiveShadow = true;
  scene.add(marker);
}

// Add trees and rocks for scenery
function addScenery() {
  // Add trees
  const treeGeometry = new THREE.ConeGeometry(2, 5, 8);
  const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
  const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

  for (let i = 0; i < 50; i++) {
    // Create tree
    const tree = new THREE.Group();

    // Create trunk
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    trunk.castShadow = true;
    tree.add(trunk);

    // Create foliage
    const foliage = new THREE.Mesh(treeGeometry, treeMaterial);
    foliage.position.y = 4.5;
    foliage.castShadow = true;
    tree.add(foliage);

    // Position tree randomly along the track
    const side = Math.random() > 0.5 ? 1 : -1;
    tree.position.set(
      side * (15 + Math.random() * 20), // X position (left or right of track)
      0, // Y position (on ground)
      -Math.random() * 800 // Z position (along track)
    );

    scene.add(tree);
  }

  // Add rocks
  const rockGeometry = new THREE.DodecahedronGeometry(1.5, 0);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.8,
    metalness: 0.2,
  });

  for (let i = 0; i < 30; i++) {
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.scale.set(
      0.5 + Math.random(),
      0.5 + Math.random(),
      0.5 + Math.random()
    );
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Position rock randomly along the track
    const side = Math.random() > 0.5 ? 1 : -1;
    rock.position.set(
      side * (12 + Math.random() * 15), // X position (left or right of track)
      0.5, // Y position (on ground)
      -Math.random() * 800 // Z position (along track)
    );

    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }
}

// Add scenery
addScenery();

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Export scene objects
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
