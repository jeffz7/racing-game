// Complete overhaul of the 3D scene

// Global variables
let track;

// Initialize scene
function initScene() {
  console.log("Initializing scene...");

  // Create scene
  window.scene = new THREE.Scene();

  // Create camera
  window.camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  window.camera.position.set(0, 5, -10); // Position camera behind and above the car
  window.camera.lookAt(0, 0, 0); // Look at the origin

  // Create renderer
  window.renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("game-canvas"),
    antialias: true,
  });
  window.renderer.setSize(window.innerWidth, window.innerHeight);
  window.renderer.setClearColor(0x87ceeb); // Sky blue background
  window.renderer.shadowMap.enabled = true;
  window.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Increased intensity
  window.scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased intensity
  directionalLight.position.set(50, 100, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -100;
  directionalLight.shadow.camera.right = 100;
  directionalLight.shadow.camera.top = 100;
  directionalLight.shadow.camera.bottom = -100;
  window.scene.add(directionalLight);

  // Add hemisphere light (sky and ground)
  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x1e8449, 0.6);
  window.scene.add(hemisphereLight);

  // Create track (using the function from track.js)
  if (typeof createTrack === "function") {
    track = createTrack();
    window.scene.add(track);
  } else {
    console.error(
      "createTrack function not found! Make sure track.js is loaded before scene.js"
    );
  }

  // Add scenery after scene is created
  addScenery();

  console.log("Scene initialized");
}

// Add scenery to the scene
function addScenery() {
  if (!window.scene) {
    console.error("Cannot add scenery: scene is not initialized");
    return;
  }

  console.log("Adding scenery...");

  // Add ground
  const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x7cfc00, // Lawn green
    roughness: 0.9,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1; // Slightly below the road
  window.scene.add(ground);

  // Add trees
  const treeCount = 50;
  for (let i = 0; i < treeCount; i++) {
    // Random position on either side of the road
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (10 + Math.random() * 20);
    const z = -Math.random() * 1000;

    // Create tree
    const tree = createTree();
    tree.position.set(x, 0, z);
    window.scene.add(tree);
  }

  // Add mountains in the background
  for (let i = 0; i < 5; i++) {
    const mountain = createMountain();
    mountain.position.set(-200 + i * 100, 0, -900);
    window.scene.add(mountain);
  }

  console.log("Scenery added");
}

// Create a tree
function createTree() {
  const tree = new THREE.Object3D();

  // Tree trunk
  const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 5);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513, // Saddle brown
    roughness: 0.8,
  });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = 2.5;
  tree.add(trunk);

  // Tree foliage
  const foliageGeometry = new THREE.ConeGeometry(3, 6, 8);
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x228b22, // Forest green
    roughness: 0.7,
  });
  const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
  foliage.position.y = 7;
  tree.add(foliage);

  return tree;
}

// Create a mountain
function createMountain() {
  const mountain = new THREE.Object3D();

  // Mountain geometry
  const mountainGeometry = new THREE.ConeGeometry(50, 100, 4);
  const mountainMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080, // Gray
    roughness: 0.9,
  });
  const mountainMesh = new THREE.Mesh(mountainGeometry, mountainMaterial);
  mountainMesh.position.y = 50;
  mountain.add(mountainMesh);

  // Snow cap
  const snowCapGeometry = new THREE.ConeGeometry(20, 20, 4);
  const snowCapMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, // White
    roughness: 0.5,
  });
  const snowCap = new THREE.Mesh(snowCapGeometry, snowCapMaterial);
  snowCap.position.y = 90;
  mountain.add(snowCap);

  return mountain;
}

// Handle window resize
window.addEventListener("resize", () => {
  window.camera.aspect = window.innerWidth / window.innerHeight;
  window.camera.updateProjectionMatrix();
  window.renderer.setSize(window.innerWidth, window.innerHeight);
});

// Export variables and functions
window.track = track;
window.initScene = initScene;
window.addScenery = addScenery;

// Function to update camera position
function updateCamera(car) {
  if (!car || !window.camera) return;

  // Camera follows car from behind and slightly above
  const cameraOffset = new THREE.Vector3(0, 3, -8);
  const cameraPosition = car.position.clone().add(cameraOffset);
  window.camera.position.copy(cameraPosition);
  window.camera.lookAt(car.position);
}

// Log to confirm they're defined
console.log("Scene objects defined:");
console.log("- scene:", typeof window.scene);
console.log("- camera:", typeof window.camera);
console.log("- renderer:", typeof window.renderer);
console.log("- updateCamera:", typeof window.updateCamera);

// Create track
function createTrack() {
  console.log("Creating track");

  // Create ground with better texture
  const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 50, 50);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e8449,
    roughness: 0.8,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  window.scene.add(ground);

  // Create road with better texture
  const roadGeometry = new THREE.PlaneGeometry(10, 1000, 10, 100);
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.7,
    metalness: 0.3,
  });
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01; // Slightly above ground to prevent z-fighting
  road.receiveShadow = true;
  window.scene.add(road);

  // Create road markings with better visibility
  const markingGeometry = new THREE.PlaneGeometry(0.5, 5);
  const markingMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.1,
    emissive: 0x555555, // Slight glow
    emissiveIntensity: 0.2,
  });

  // Create multiple markings along the road
  for (let i = -490; i < 490; i += 20) {
    const marking = new THREE.Mesh(markingGeometry, markingMaterial);
    marking.rotation.x = -Math.PI / 2;
    marking.position.set(0, 0.02, i); // Slightly above road
    marking.receiveShadow = true;
    window.scene.add(marking);
  }

  // Create finish line with better visibility
  const finishLineGeometry = new THREE.PlaneGeometry(10, 5);
  const finishLineMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.1,
    emissive: 0x555555, // Slight glow
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.9,
  });
  const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
  finishLine.rotation.x = -Math.PI / 2;
  finishLine.position.set(0, 0.02, 450); // Near the end of the road
  finishLine.receiveShadow = true;
  window.scene.add(finishLine);

  // Add some trees and rocks for visual interest
  addEnvironmentObjects();

  // Store finish line position for collision detection
  gameState.finishLinePosition = 450;

  console.log("Track created");
}

// Add environment objects (trees, rocks, etc.)
function addEnvironmentObjects() {
  // Create tree geometry
  const treeTopGeometry = new THREE.ConeGeometry(2, 4, 8);
  const treeTopMaterial = new THREE.MeshStandardMaterial({
    color: 0x2ecc71,
    roughness: 0.8,
    metalness: 0.1,
  });

  const treeTrunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
  const treeTrunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.9,
    metalness: 0.1,
  });

  // Create rock geometry
  const rockGeometry = new THREE.DodecahedronGeometry(1.5, 0);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x7f8c8d,
    roughness: 0.9,
    metalness: 0.2,
  });

  // Add trees and rocks along the road
  for (let i = -450; i < 450; i += 30) {
    // Left side trees
    if (Math.random() > 0.3) {
      // 70% chance to place a tree
      const treeTop = new THREE.Mesh(treeTopGeometry, treeTopMaterial);
      const treeTrunk = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);

      const treeGroup = new THREE.Group();
      treeTop.position.y = 3;
      treeTrunk.position.y = 0;

      treeGroup.add(treeTop);
      treeGroup.add(treeTrunk);

      // Random position with offset from road
      const offsetX = -15 - Math.random() * 20;
      const offsetZ = i + Math.random() * 10 - 5;

      treeGroup.position.set(offsetX, 0, offsetZ);
      treeGroup.castShadow = true;
      treeGroup.receiveShadow = true;

      window.scene.add(treeGroup);
    }

    // Right side trees
    if (Math.random() > 0.3) {
      // 70% chance to place a tree
      const treeTop = new THREE.Mesh(treeTopGeometry, treeTopMaterial);
      const treeTrunk = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);

      const treeGroup = new THREE.Group();
      treeTop.position.y = 3;
      treeTrunk.position.y = 0;

      treeGroup.add(treeTop);
      treeGroup.add(treeTrunk);

      // Random position with offset from road
      const offsetX = 15 + Math.random() * 20;
      const offsetZ = i + Math.random() * 10 - 5;

      treeGroup.position.set(offsetX, 0, offsetZ);
      treeGroup.castShadow = true;
      treeGroup.receiveShadow = true;

      window.scene.add(treeGroup);
    }

    // Add some rocks
    if (Math.random() > 0.7) {
      // 30% chance to place a rock
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);

      // Random position with offset from road
      const side = Math.random() > 0.5 ? 1 : -1; // Left or right side
      const offsetX = (10 + Math.random() * 10) * side;
      const offsetZ = i + Math.random() * 10 - 5;

      rock.position.set(offsetX, 0, offsetZ);
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rock.scale.set(
        0.5 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5
      );

      rock.castShadow = true;
      rock.receiveShadow = true;

      window.scene.add(rock);
    }
  }
}

// Export functions to global scope
window.updateCamera = updateCamera;
window.createTrack = createTrack;
window.addEnvironmentObjects = addEnvironmentObjects;

// Log to confirm they're defined
console.log("Scene objects defined:");
console.log("- scene:", typeof window.scene);
console.log("- camera:", typeof window.camera);
console.log("- renderer:", typeof window.renderer);
console.log("- updateCamera:", typeof window.updateCamera);
console.log("- createTrack:", typeof window.createTrack);
console.log("- addEnvironmentObjects:", typeof window.addEnvironmentObjects);

// Check if scene objects are defined after initialization
if (!window.scene || !window.camera || !window.renderer) {
  console.error(
    "Critical scene objects are still undefined after initialization!"
  );
} else {
  console.log("Scene objects successfully initialized:");
  console.log("- scene:", typeof window.scene);
  console.log("- camera:", typeof window.camera);
  console.log("- renderer:", typeof window.renderer);
}
