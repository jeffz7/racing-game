// Complete overhaul of car creation and movement

// Create a car with the given color
function createCar(color, name) {
  console.log(`Creating car with color ${color} and name ${name}`);

  // Create car container
  const car = new THREE.Group();

  // Create car body
  const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
  const bodyMaterial = new THREE.MeshPhongMaterial({ color: color });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.5;
  body.castShadow = true;
  car.add(body);

  // Create car roof
  const roofGeometry = new THREE.BoxGeometry(1.5, 0.7, 2);
  const roofMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = 1.35;
  roof.position.z = -0.5;
  roof.castShadow = true;
  car.add(roof);

  // Create wheels
  const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 32);
  const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x111111 });

  // Front left wheel
  const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelFL.rotation.z = Math.PI / 2;
  wheelFL.position.set(-1.2, 0.5, 1.2);
  wheelFL.castShadow = true;
  car.add(wheelFL);

  // Front right wheel
  const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelFR.rotation.z = Math.PI / 2;
  wheelFR.position.set(1.2, 0.5, 1.2);
  wheelFR.castShadow = true;
  car.add(wheelFR);

  // Rear left wheel
  const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelRL.rotation.z = Math.PI / 2;
  wheelRL.position.set(-1.2, 0.5, -1.2);
  wheelRL.castShadow = true;
  car.add(wheelRL);

  // Rear right wheel
  const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheelRR.rotation.z = Math.PI / 2;
  wheelRR.position.set(1.2, 0.5, -1.2);
  wheelRR.castShadow = true;
  car.add(wheelRR);

  // Create headlights
  const headlightGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.1);
  const headlightMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffcc,
    emissive: 0xffffcc,
    emissiveIntensity: 0.5,
  });

  // Left headlight
  const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
  headlightL.position.set(-0.7, 0.7, 2);
  car.add(headlightL);

  // Right headlight
  const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
  headlightR.position.set(0.7, 0.7, 2);
  car.add(headlightR);

  // Create taillights
  const taillightGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.1);
  const taillightMaterial = new THREE.MeshPhongMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.5,
  });

  // Left taillight
  const taillightL = new THREE.Mesh(taillightGeometry, taillightMaterial);
  taillightL.position.set(-0.7, 0.7, -2);
  car.add(taillightL);

  // Right taillight
  const taillightR = new THREE.Mesh(taillightGeometry, taillightMaterial);
  taillightR.position.set(0.7, 0.7, -2);
  car.add(taillightR);

  // Add name label
  if (name) {
    // Create a canvas for the label
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext("2d");

    // Draw background
    context.fillStyle = "rgba(0, 0, 0, 0.7)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    context.strokeStyle = "white";
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Draw text
    context.font = "24px Arial";
    context.fillStyle = "white";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(name, canvas.width / 2, canvas.height / 2);

    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    // Position the sprite above the car
    sprite.position.set(0, 2.5, 0);
    sprite.scale.set(2, 0.5, 1);

    // Add sprite to car
    car.add(sprite);

    // Store reference to label
    car.userData.label = sprite;
  }

  // Store metadata
  car.userData = {
    ...car.userData,
    name: name,
    color: color,
    wheels: {
      fl: wheelFL,
      fr: wheelFR,
      rl: wheelRL,
      rr: wheelRR,
    },
  };

  console.log(`Car created with name ${name}`);
  return car;
}

// Function to update car wheels based on speed
function updateCarWheels(car, speed) {
  if (!car || !car.userData || !car.userData.wheels) return;

  const wheels = car.userData.wheels;
  const rotationSpeed = speed * 0.01;

  // Rotate all wheels
  wheels.fl.rotation.x += rotationSpeed;
  wheels.fr.rotation.x += rotationSpeed;
  wheels.rl.rotation.x += rotationSpeed;
  wheels.rr.rotation.x += rotationSpeed;
}

// Export functions
window.createCar = createCar;
window.updateCarWheels = updateCarWheels;
