// Complete overhaul of car creation and movement

// Create player car (use window.playerCar to avoid redeclaration)
window.playerCar = null;

// Function to create a car
function createCar(color = 0x3498db, name = "Player") {
  // Create car body
  const carBody = new THREE.Group();

  // Create car chassis
  const chassisGeometry = new THREE.BoxGeometry(2, 0.5, 4);
  const chassisMaterial = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.2,
    metalness: 0.8,
    emissive: color,
    emissiveIntensity: 0.2,
  });
  const chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);
  chassis.position.y = 0.5;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  carBody.add(chassis);

  // Create car cabin
  const cabinGeometry = new THREE.BoxGeometry(1.5, 0.8, 2);
  const cabinMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.7,
  });
  const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
  cabin.position.y = 1.15;
  cabin.position.z = -0.5;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  carBody.add(cabin);

  // Create car front (more aerodynamic)
  const frontGeometry = new THREE.ConeGeometry(1, 1, 4);
  frontGeometry.rotateX(-Math.PI / 2);
  const frontMaterial = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.2,
    metalness: 0.8,
    emissive: color,
    emissiveIntensity: 0.2,
  });
  const front = new THREE.Mesh(frontGeometry, frontMaterial);
  front.position.set(0, 0.5, 2);
  front.castShadow = true;
  front.receiveShadow = true;
  carBody.add(front);

  // Create wheels with better detail
  const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.9,
    metalness: 0.1,
  });

  // Create wheel rim material
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.1,
    metalness: 0.9,
    emissive: 0x555555,
    emissiveIntensity: 0.2,
  });

  // Function to create a wheel with rim
  function createWheel(x, y, z) {
    const wheelGroup = new THREE.Group();

    // Tire
    const tire = new THREE.Mesh(wheelGeometry, wheelMaterial);
    tire.rotation.z = Math.PI / 2;
    wheelGroup.add(tire);

    // Rim (slightly smaller than tire)
    const rimGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.31, 8);
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // Position the wheel
    wheelGroup.position.set(x, y, z);
    wheelGroup.castShadow = true;
    wheelGroup.receiveShadow = true;

    return wheelGroup;
  }

  // Create wheels
  const wheelFL = createWheel(-1.1, 0.4, 1.2);
  const wheelFR = createWheel(1.1, 0.4, 1.2);
  const wheelRL = createWheel(-1.1, 0.4, -1.2);
  const wheelRR = createWheel(1.1, 0.4, -1.2);

  // Add wheels to car
  carBody.add(wheelFL);
  carBody.add(wheelFR);
  carBody.add(wheelRL);
  carBody.add(wheelRR);

  // Store wheels for animation
  carBody.wheels = [wheelFL, wheelFR, wheelRL, wheelRR];

  // Add headlights
  const headlightGeometry = new THREE.CircleGeometry(0.2, 16);
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffcc,
    emissive: 0xffffcc,
    emissiveIntensity: 0.5,
  });

  // Left headlight
  const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
  headlightL.position.set(-0.6, 0.7, 2);
  headlightL.rotation.y = Math.PI;
  carBody.add(headlightL);

  // Right headlight
  const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
  headlightR.position.set(0.6, 0.7, 2);
  headlightR.rotation.y = Math.PI;
  carBody.add(headlightR);

  // Add taillights
  const taillightGeometry = new THREE.CircleGeometry(0.15, 16);
  const taillightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.5,
  });

  // Left taillight
  const taillightL = new THREE.Mesh(taillightGeometry, taillightMaterial);
  taillightL.position.set(-0.6, 0.7, -2);
  carBody.add(taillightL);

  // Right taillight
  const taillightR = new THREE.Mesh(taillightGeometry, taillightMaterial);
  taillightR.position.set(0.6, 0.7, -2);
  carBody.add(taillightR);

  // Add player name label
  if (name) {
    // Create canvas for text
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 64;

    // Draw text
    context.fillStyle = "#ffffff";
    context.font = "Bold 24px Arial";
    context.textAlign = "center";
    context.fillText(name, 128, 32);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const label = new THREE.Sprite(labelMaterial);
    label.position.y = 2.5;
    label.scale.set(2, 0.5, 1);
    carBody.add(label);
  }

  // Set initial position
  carBody.position.set(0, 0, 0);

  // Set initial rotation (facing forward along Z axis)
  carBody.rotation.y = 0;

  // Add car to scene
  carBody.userData = {
    speed: 0,
    acceleration: 0,
    maxSpeed: 0.5,
    handling: 0.03,
    wheels: [wheelFL, wheelFR, wheelRL, wheelRR],
    name: name,
  };

  return carBody;
}

// Function to create player car
function createPlayerCar() {
  console.log("Creating player car");

  if (!window.scene) {
    console.error("Cannot create player car: scene is undefined");
    return null;
  }

  // Create car with blue color
  const car = createCar(0x3498db, "Player");
  car.position.set(0, 0, 0);
  window.scene.add(car);

  // Store reference to player car
  window.playerCar = car;

  console.log("Player car created");

  return car;
}

// Function to update car position and rotation
function updateCar(car) {
  if (!car) return;

  // Get car data
  const carData = car.userData;

  // Update car position based on speed and rotation
  car.position.x += Math.sin(car.rotation.y) * carData.speed;
  car.position.z += Math.cos(car.rotation.y) * carData.speed;

  // Apply friction to gradually slow down the car
  carData.speed *= 0.98;
}

// Function to update car wheels rotation
function updateCarWheels(car) {
  if (!car) return;

  // Get car data
  const carData = car.userData;

  // Calculate wheel rotation speed based on car speed
  const wheelRotationSpeed = carData.speed * 0.5;

  // Update each wheel rotation
  for (const wheel of carData.wheels) {
    wheel.rotation.x += wheelRotationSpeed;
  }
}

// Export functions to global scope
window.createCar = createCar;
window.createPlayerCar = createPlayerCar;
window.updateCar = updateCar;
window.updateCarWheels = updateCarWheels;

// Log to confirm they're defined
console.log("Car functions defined:");
console.log("- createCar:", typeof window.createCar);
console.log("- createPlayerCar:", typeof window.createPlayerCar);
console.log("- updateCar:", typeof window.updateCar);
console.log("- updateCarWheels:", typeof window.updateCarWheels);
