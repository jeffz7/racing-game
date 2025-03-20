// Create a car
function createCar(color, name = "") {
  const car = new THREE.Group();

  // Car body
  const bodyGeometry = new THREE.BoxGeometry(4, 1, 6);
  const bodyMaterial = new THREE.MeshPhongMaterial({ color: color });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  car.add(body);

  // Car roof
  const roofGeometry = new THREE.BoxGeometry(3, 1, 3);
  const roofMaterial = new THREE.MeshPhongMaterial({ color: color });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = 1.5;
  roof.position.z = -0.5;
  roof.castShadow = true;
  car.add(roof);

  // Add player name on roof
  if (name) {
    // Create text geometry for the name
    const loader = new THREE.FontLoader();

    // Use a fallback approach with a simple mesh if font loading fails
    // Create a canvas for the name
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 128;

    // Draw name on canvas
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = "Bold 40px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#000000";

    // Shorten name if too long
    let displayName = name;
    if (displayName.length > 8) {
      displayName = displayName.substring(0, 7) + ".";
    }

    context.fillText(displayName, canvas.width / 2, canvas.height / 2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);

    // Create material with the texture
    const nameMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Create a plane for the name
    const nameGeometry = new THREE.PlaneGeometry(2.5, 1.25);
    const nameMesh = new THREE.Mesh(nameGeometry, nameMaterial);

    // Position name on roof
    nameMesh.position.set(0, 2.1, -0.5); // Just above the roof
    nameMesh.rotation.x = -Math.PI / 2; // Lay flat on roof

    car.add(nameMesh);

    // Try to load font for better text (if available)
    try {
      loader.load(
        "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json",
        function (font) {
          const textGeometry = new THREE.TextGeometry(displayName, {
            font: font,
            size: 0.4,
            height: 0.05,
            curveSegments: 4,
            bevelEnabled: false,
          });

          // Center the text
          textGeometry.computeBoundingBox();
          const textWidth =
            textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;

          const textMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
          const textMesh = new THREE.Mesh(textGeometry, textMaterial);

          // Position text on roof
          textMesh.position.set(-textWidth / 2, 2.1, -0.5);
          textMesh.rotation.x = -Math.PI / 2; // Lay flat on roof

          // Remove the canvas-based name and add the font-based one
          car.remove(nameMesh);
          car.add(textMesh);
        }
      );
    } catch (e) {
      console.log("Using canvas-based name display as fallback");
    }
  }

  // Wheels
  const wheelGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.5, 32);
  const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
  wheelMaterial.side = THREE.DoubleSide;

  // Position wheels at corners
  const wheelPositions = [
    { x: -1.8, y: 0, z: -2 },
    { x: 1.8, y: 0, z: -2 },
    { x: -1.8, y: 0, z: 2 },
    { x: 1.8, y: 0, z: 2 },
  ];

  wheelPositions.forEach((position) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(position.x, position.y, position.z);
    wheel.rotation.x = Math.PI / 2;
    wheel.castShadow = true;
    car.add(wheel);
  });

  // Headlights
  const headlightGeometry = new THREE.SphereGeometry(0.5, 16, 16);
  const headlightMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffcc,
    emissive: 0xffffcc,
  });

  // Add headlights at front corners
  const headlightPositions = [
    { x: -1.5, y: 0.5, z: 3 },
    { x: 1.5, y: 0.5, z: 3 },
  ];

  headlightPositions.forEach((position) => {
    const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlight.position.set(position.x, position.y, position.z);
    headlight.scale.set(0.3, 0.3, 0.3);
    car.add(headlight);
  });

  // Add exhaust pipe
  const exhaustGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
  const exhaustMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
  const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
  exhaust.position.set(-1.5, 0.2, -3);
  exhaust.rotation.x = Math.PI / 2;
  car.add(exhaust);

  // Create exhaust particles system
  try {
    const exhaustParticles = new THREE.Group(); // Create a valid THREE.Group
    exhaustParticles.position.set(-1.5, 0.2, -3.2);
    car.add(exhaustParticles);

    // Create particle meshes
    const particleCount = 5;
    const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.7,
    });

    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(
        particleGeometry,
        particleMaterial.clone()
      );
      particle.visible = false;
      particle.userData = {
        life: 0,
        maxLife: 20 + Math.random() * 10,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          -0.05 - Math.random() * 0.05
        ),
      };
      exhaustParticles.add(particle);
    }

    // Store reference to particles
    car.userData.exhaustParticles = exhaustParticles;
  } catch (error) {
    console.error("Error creating exhaust particles:", error);
    // Create a fallback empty group if there's an error
    car.userData.exhaustParticles = new THREE.Group();
    car.add(car.userData.exhaustParticles);
  }

  return car;
}

// Create exhaust particles
function createExhaustParticles() {
  const particleGroup = new THREE.Group();

  // We'll use simple meshes as particles
  const particleCount = 5;
  const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
  const particleMaterial = new THREE.MeshBasicMaterial({
    color: 0xaaaaaa,
    transparent: true,
    opacity: 0.7,
  });

  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
    particle.visible = false;
    particle.userData = {
      life: 0,
      maxLife: 20 + Math.random() * 10,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        -0.05 - Math.random() * 0.05
      ),
    };
    particleGroup.add(particle);
  }

  return particleGroup;
}

// Note: updateExhaustParticles is now defined in utils.js
