// Create the track with boundaries, checkpoints, and visual elements
function createTrack() {
  const trackLength = 800;
  const trackWidth = config.trackWidth;

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(trackWidth + 100, trackLength + 200),
    new THREE.MeshStandardMaterial({ color: 0x228b22 }) // Grass green
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Track surface (flat road)
  const trackGeometry = new THREE.PlaneGeometry(trackWidth, trackLength);
  const trackMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333, // Dark gray asphalt
  });
  const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
  trackMesh.rotation.x = -Math.PI / 2;
  trackMesh.position.y = 0.01;
  trackMesh.receiveShadow = true;
  scene.add(trackMesh);

  // Add lane markings (dashed lines)
  addLaneMarkings(trackWidth, trackLength);

  // Add distance markers along the track
  addDistanceMarkers(trackWidth, trackLength);

  // Boundary Walls
  const wallGeometry = new THREE.BoxGeometry(1, 3, trackLength);
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc, // Light gray concrete
  });

  // Left Wall
  const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
  leftWall.position.set(-trackWidth / 2 - 0.5, 1.5, 0);
  scene.add(leftWall);

  // Right Wall
  const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
  rightWall.position.set(trackWidth / 2 + 0.5, 1.5, 0);
  scene.add(rightWall);

  // Add banners to walls
  addBanners(trackWidth, trackLength);

  // Start Line (more prominent)
  const startLineZ = -trackLength / 2 + 10;
  createStartLine(trackWidth, startLineZ);

  // Finish Line
  const finishLineZ = trackLength / 2 - 10;
  createFinishLine(trackWidth, finishLineZ);

  // Save finish line position globally
  window.finishLineZ = finishLineZ;
  window.startLineZ = startLineZ;

  // Add finish line
  const finishLineGeometry = new THREE.PlaneGeometry(20, 2);
  const finishLineMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });

  // Create checkerboard pattern
  const finishLineTexture = createCheckerboardTexture();
  finishLineMaterial.map = finishLineTexture;

  const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
  finishLine.rotation.x = Math.PI / 2; // Lay flat on the ground
  finishLine.position.set(0, 0.05, -RACE_DISTANCE); // Slightly above ground to avoid z-fighting
  scene.add(finishLine);

  // Add finish zone markers
  createFinishZoneMarkers();

  // Store finish line position for collision detection
  window.finishLinePosition = -RACE_DISTANCE;

  // Add finish line and finish zone
  createFinishLine();

  console.log("Track created with visual enhancements");
}

// Add lane markings (dashed lines) to the track
function addLaneMarkings(trackWidth, trackLength) {
  // Center line
  const dashLength = 5;
  const gapLength = 5;
  const totalDashes = Math.floor(trackLength / (dashLength + gapLength));

  const dashGeometry = new THREE.PlaneGeometry(0.3, dashLength);
  const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White

  // Create center line dashes
  for (let i = 0; i < totalDashes; i++) {
    const dash = new THREE.Mesh(dashGeometry, dashMaterial);
    const zPosition =
      -trackLength / 2 + i * (dashLength + gapLength) + dashLength / 2;
    dash.position.set(0, 0.05, zPosition);
    dash.rotation.x = -Math.PI / 2;
    scene.add(dash);
  }

  // Add lane markings if track is wide enough for multiple lanes
  if (trackWidth >= 12) {
    // Calculate lane width
    const lanes = 3; // 3 lanes
    const laneWidth = trackWidth / lanes;

    // Add lane dividers
    for (let lane = 1; lane < lanes; lane++) {
      const laneX = -trackWidth / 2 + lane * laneWidth;

      // Create dashed line for this lane divider
      for (let i = 0; i < totalDashes; i++) {
        const dash = new THREE.Mesh(dashGeometry, dashMaterial);
        const zPosition =
          -trackLength / 2 + i * (dashLength + gapLength) + dashLength / 2;
        dash.position.set(laneX, 0.05, zPosition);
        dash.rotation.x = -Math.PI / 2;
        scene.add(dash);
      }
    }
  }
}

// Add distance markers along the track
function addDistanceMarkers(trackWidth, trackLength) {
  const markerInterval = 100; // Place markers every 100 units
  const markerCount = Math.floor(trackLength / markerInterval);

  // Create text loader
  const loader = new THREE.FontLoader();

  // Use a fallback approach with simple colored markers
  for (let i = 1; i <= markerCount; i++) {
    const distance = i * markerInterval;
    const zPosition = -trackLength / 2 + distance;

    // Left side marker
    const leftMarker = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff8800 }) // Orange
    );
    leftMarker.position.set(-trackWidth / 2 - 1, 1, zPosition);
    scene.add(leftMarker);

    // Right side marker
    const rightMarker = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff8800 }) // Orange
    );
    rightMarker.position.set(trackWidth / 2 + 1, 1, zPosition);
    scene.add(rightMarker);

    // Create canvas for distance text
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 128;
    canvas.height = 64;

    // Draw distance on canvas
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = "Bold 48px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#000000";
    context.fillText(distance + "m", canvas.width / 2, canvas.height / 2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);

    // Create material with the texture
    const textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Create a plane for the text
    const textGeometry = new THREE.PlaneGeometry(2, 1);

    // Left text
    const leftText = new THREE.Mesh(textGeometry, textMaterial);
    leftText.position.set(-trackWidth / 2 - 1, 2.5, zPosition);
    leftText.rotation.y = Math.PI / 2;
    scene.add(leftText);

    // Right text
    const rightText = new THREE.Mesh(textGeometry, textMaterial);
    rightText.position.set(trackWidth / 2 + 1, 2.5, zPosition);
    rightText.rotation.y = -Math.PI / 2;
    scene.add(rightText);
  }
}

// Add banners to the walls
function addBanners(trackWidth, trackLength) {
  // Banner textures - create an array of sponsor names
  const sponsors = [
    "TURBO RACING",
    "SPEED MOTORS",
    "NITRO FUEL",
    "RACING TIRES",
    "SUPER OIL",
    "DRIFT KINGS",
  ];

  // Create banners at intervals
  const bannerInterval = 50; // Every 50 units
  const bannerCount = Math.floor(trackLength / bannerInterval) - 1;
  const bannerWidth = 20;
  const bannerHeight = 3;

  for (let i = 0; i < bannerCount; i++) {
    const zPosition = -trackLength / 2 + 50 + i * bannerInterval;
    const sponsorIndex = i % sponsors.length;

    // Create canvas for banner
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 128;

    // Create gradient background
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);

    // Alternate banner colors
    if (i % 2 === 0) {
      gradient.addColorStop(0, "#ff0000");
      gradient.addColorStop(1, "#880000");
    } else {
      gradient.addColorStop(0, "#0000ff");
      gradient.addColorStop(1, "#000088");
    }

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add sponsor text
    context.font = "Bold 64px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#ffffff";
    context.fillText(
      sponsors[sponsorIndex],
      canvas.width / 2,
      canvas.height / 2
    );

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);

    // Create banner material
    const bannerMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });

    // Create banner geometry
    const bannerGeometry = new THREE.PlaneGeometry(bannerWidth, bannerHeight);

    // Left wall banner
    const leftBanner = new THREE.Mesh(bannerGeometry, bannerMaterial);
    leftBanner.position.set(-trackWidth / 2 - 1, 3, zPosition);
    leftBanner.rotation.y = Math.PI / 2;
    scene.add(leftBanner);

    // Right wall banner
    const rightBanner = new THREE.Mesh(bannerGeometry, bannerMaterial);
    rightBanner.position.set(trackWidth / 2 + 1, 3, zPosition);
    rightBanner.rotation.y = -Math.PI / 2;
    scene.add(rightBanner);
  }
}

// Create a prominent start line
function createStartLine(trackWidth, zPosition) {
  // Create a checkered pattern for the start line
  const segments = 20;
  const segmentWidth = trackWidth / segments;

  for (let i = 0; i < segments; i++) {
    const xPosition = -trackWidth / 2 + i * segmentWidth + segmentWidth / 2;
    const color = i % 2 === 0 ? 0xffffff : 0x000000; // Alternate white and black

    const startLineSegment = new THREE.Mesh(
      new THREE.PlaneGeometry(segmentWidth, 3),
      new THREE.MeshBasicMaterial({ color: color })
    );

    startLineSegment.rotation.x = -Math.PI / 2;
    startLineSegment.position.set(xPosition, 0.05, zPosition);
    scene.add(startLineSegment);
  }

  // Add "START" text on the road
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 128;

  // Draw START text
  context.fillStyle = "#ff0000"; // Red background
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = "Bold 96px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffffff"; // White text
  context.fillText("START", canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const textMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });

  const startText = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2.5),
    textMaterial
  );

  startText.rotation.x = -Math.PI / 2;
  startText.position.set(0, 0.06, zPosition - 5);
  scene.add(startText);

  // Add start lights
  const lightStand = new THREE.Mesh(
    new THREE.BoxGeometry(trackWidth + 4, 0.5, 0.5),
    new THREE.MeshPhongMaterial({ color: 0x888888 })
  );

  lightStand.position.set(0, 6, zPosition);
  scene.add(lightStand);

  // Add traffic lights
  for (let i = 0; i < 5; i++) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x333333 }) // Initially off
    );

    light.position.set(
      -trackWidth / 2 + 2 + (i * trackWidth) / 5,
      5.5,
      zPosition
    );
    scene.add(light);

    // Store reference to light for animation
    if (!window.startLights) window.startLights = [];
    window.startLights.push(light);
  }
}

// Enhance the createFinishLine function to add more visual elements
function createFinishLine() {
  console.log("Creating finish line at distance:", gameState.finishDistance);

  // Create finish line (checkered pattern on the road)
  const finishLineWidth = config.trackWidth || 20;

  // Create multiple checkered strips across the road
  const stripCount = 5; // Number of checkered strips
  const stripWidth = finishLineWidth;
  const stripDepth = 2;
  const stripSpacing = 2;

  for (let i = 0; i < stripCount; i++) {
    const zPosition =
      -gameState.finishDistance - i * (stripDepth + stripSpacing);

    // Create checkered strip
    const stripGeometry = new THREE.PlaneGeometry(stripWidth, stripDepth);
    const stripTexture = createCheckerboardTexture();

    const stripMaterial = new THREE.MeshBasicMaterial({
      map: stripTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    const strip = new THREE.Mesh(stripGeometry, stripMaterial);
    strip.rotation.x = Math.PI / 2; // Lay flat on the ground
    strip.position.set(0, 0.05, zPosition); // Slightly above ground
    scene.add(strip);

    console.log(`Created checkered strip at z = ${zPosition}`);
  }

  // Add finish line banner/arch (enhanced version)
  createEnhancedFinishArch(finishLineWidth);

  // Add finish zone decorations
  createFinishZoneDecorations();

  // Add finish line particles (initially hidden)
  createFinishParticles();

  // Add physical barrier at the end of finish zone to prevent cars from going too far
  createFinishBarrier();

  console.log("Finish line created at z =", -gameState.finishDistance);
}

// Create an enhanced finish arch with more details
function createEnhancedFinishArch(width) {
  const archHeight = 12;
  const poleRadius = 0.4;

  // Create left pole
  const poleGeometry = new THREE.CylinderGeometry(
    poleRadius,
    poleRadius * 1.2,
    archHeight,
    8
  );
  const poleMaterial = new THREE.MeshBasicMaterial({
    color: 0xdddddd,
    map: createPoleTexture(),
  });

  const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
  leftPole.position.set(-width / 2, archHeight / 2, -gameState.finishDistance);
  scene.add(leftPole);

  // Create right pole
  const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
  rightPole.position.set(width / 2, archHeight / 2, -gameState.finishDistance);
  scene.add(rightPole);

  // Create top arch
  const archRadius = width / 2;
  const archThickness = 1;
  const archSegments = 20;
  const archGeometry = new THREE.TorusGeometry(
    archRadius, // radius
    archThickness / 2, // tube radius
    8, // radial segments
    archSegments, // tubular segments
    Math.PI // arc (half circle)
  );

  const archMaterial = new THREE.MeshBasicMaterial({
    color: 0xdddddd,
    map: createPoleTexture(),
  });

  const arch = new THREE.Mesh(archGeometry, archMaterial);
  arch.rotation.x = Math.PI / 2; // Rotate to form an arch
  arch.position.set(0, archHeight, -gameState.finishDistance);
  scene.add(arch);

  // Create banner
  const bannerGeometry = new THREE.BoxGeometry(width, 3, 0.5);
  const bannerMaterial = new THREE.MeshBasicMaterial({
    color: 0x222222,
    side: THREE.DoubleSide,
  });

  const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
  banner.position.set(0, archHeight - 2, -gameState.finishDistance);
  scene.add(banner);

  // Create "FINISH" text
  createFinishText(banner);

  // Add checkered flags on top of the arch
  createArchFlags(arch, archRadius, archSegments);
}

// Create texture for the poles
function createPoleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");

  // Create a metallic look
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "#888888");
  gradient.addColorStop(0.5, "#eeeeee");
  gradient.addColorStop(1, "#888888");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add some texture/detail
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  for (let i = 0; i < 10; i++) {
    const y = i * (canvas.height / 10);
    ctx.fillRect(0, y, canvas.width, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Create checkered flags on top of the arch
function createArchFlags(arch, radius, segments) {
  const flagSize = 1.5;
  const flagCount = 5;
  const flagSpacing = Math.PI / (flagCount + 1);

  for (let i = 1; i <= flagCount; i++) {
    const angle = flagSpacing * i;

    // Calculate position on the arch
    const x = radius * Math.sin(angle);
    const y = radius * Math.cos(angle);

    // Create flag
    const flagGeometry = new THREE.PlaneGeometry(flagSize, flagSize);
    const flagTexture = createCheckerboardTexture(8, 8); // 8x8 checker pattern

    const flagMaterial = new THREE.MeshBasicMaterial({
      map: flagTexture,
      side: THREE.DoubleSide,
      transparent: true,
    });

    const flag = new THREE.Mesh(flagGeometry, flagMaterial);

    // Position flag on top of arch
    flag.position.set(x, arch.position.y + y, arch.position.z);

    // Rotate flag to face outward from arch
    flag.rotation.y = Math.PI / 2;
    flag.rotation.x = angle - Math.PI / 2;

    scene.add(flag);

    // Add animation
    flag.userData = {
      animation: {
        waveSpeed: 2 + Math.random(),
        waveAmount: 0.1 + Math.random() * 0.1,
        initialRotation: flag.rotation.z,
        time: Math.random() * 100,
      },
    };

    // Add to animated objects
    if (!window.animatedObjects) window.animatedObjects = [];
    window.animatedObjects.push(flag);
  }
}

// Create a physical barrier at the end of finish zone to prevent cars from going too far
function createFinishBarrier() {
  const barrierDistance =
    gameState.finishDistance + config.finish.stopDistance + 20;
  const trackWidth = config.trackWidth || 20;
  const barrierHeight = 5;

  // Create tire barrier
  const barrierGeometry = new THREE.BoxGeometry(
    trackWidth + 10,
    barrierHeight,
    2
  );
  const barrierMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });

  const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
  barrier.position.set(0, barrierHeight / 2, -barrierDistance);
  scene.add(barrier);

  // Add tire texture
  const tireSize = 1.5;
  const tireCount = Math.floor(trackWidth / tireSize);

  for (let i = 0; i < tireCount; i++) {
    const xPos = (i - tireCount / 2) * tireSize + tireSize / 2;

    for (let y = 0; y < 3; y++) {
      const tireGeometry = new THREE.TorusGeometry(
        tireSize / 2,
        tireSize / 4,
        8,
        16
      );
      const tireMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });

      const tire = new THREE.Mesh(tireGeometry, tireMaterial);
      tire.position.set(xPos, y * tireSize, -barrierDistance + 0.5);
      tire.rotation.y = Math.PI / 2;
      scene.add(tire);
    }
  }

  // Add warning signs
  createWarningSign(-trackWidth / 2 - 3, 3, -barrierDistance + 1);
  createWarningSign(trackWidth / 2 + 3, 3, -barrierDistance + 1);

  console.log(`Created finish barrier at z = ${-barrierDistance}`);

  // Add to physics collision objects
  if (typeof addCollisionObject === "function") {
    addCollisionObject({
      position: { x: 0, y: 0, z: -barrierDistance },
      size: { width: trackWidth + 10, height: barrierHeight, depth: 2 },
      type: "barrier",
    });
  }
}

// Create warning sign
function createWarningSign(x, y, z) {
  const signGeometry = new THREE.PlaneGeometry(2, 2);

  // Create warning texture
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");

  // Yellow background
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Black border
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

  // Warning text
  ctx.fillStyle = "#000000";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("STOP", canvas.width / 2, canvas.height / 2 - 15);
  ctx.fillText("FINISH", canvas.width / 2, canvas.height / 2 + 15);

  const texture = new THREE.CanvasTexture(canvas);

  const signMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });

  const sign = new THREE.Mesh(signGeometry, signMaterial);
  sign.position.set(x, y, z);
  sign.rotation.y = (Math.PI / 4) * (x > 0 ? -1 : 1); // Angle toward track
  scene.add(sign);

  // Add pole
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, y * 2, 8);
  const poleMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });

  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.set(x, y / 2, z);
  scene.add(pole);
}

// Create a more detailed checkered texture
function createCheckerboardTexture(xCount = 8, yCount = 2) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const squareSizeX = size / xCount;
  const squareSizeY = size / yCount;

  // Draw checkered pattern
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#ffffff";
  for (let x = 0; x < xCount; x++) {
    for (let y = 0; y < yCount; y++) {
      if ((x + y) % 2 === 0) {
        ctx.fillRect(
          x * squareSizeX,
          y * squareSizeY,
          squareSizeX,
          squareSizeY
        );
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Create markers for the finish zone
function createFinishZoneMarkers() {
  // Add decorative elements to mark the finish zone
  const FINISH_ZONE_LENGTH = 100;

  // Add banners/flags on both sides of the finish zone
  for (let i = 0; i < 5; i++) {
    // Left side flags
    createFinishFlag(-10, 0, -RACE_DISTANCE - i * 20, 0xff0000);

    // Right side flags
    createFinishFlag(10, 0, -RACE_DISTANCE - i * 20, 0x0000ff);
  }

  // Add confetti particle system at finish line
  createFinishConfetti();
}

// Create a finish flag
function createFinishFlag(x, y, z, color) {
  // Flag pole
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
  const poleMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.set(x, y + 2.5, z);
  scene.add(pole);

  // Flag
  const flagGeometry = new THREE.PlaneGeometry(2, 1);
  const flagMaterial = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.position.set(x + 1, y + 4, z);
  flag.rotation.y = Math.PI / 2;
  scene.add(flag);

  // Animate flag waving
  const waveSpeed = 0.005 + Math.random() * 0.01;
  const waveAmount = 0.1 + Math.random() * 0.2;
  const initialRotation = flag.rotation.z;

  // Store animation parameters
  flag.userData.animation = {
    waveSpeed: waveSpeed,
    waveAmount: waveAmount,
    initialRotation: initialRotation,
    time: Math.random() * 100, // Random start time for variety
  };

  // Add to animated objects
  if (!window.animatedFlags) window.animatedFlags = [];
  window.animatedFlags.push(flag);
}

// Create confetti particle system
function createFinishConfetti() {
  const particleCount = 500;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);

  // Initialize particles above finish line
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // Position (random above finish line)
    particlePositions[i3] = (Math.random() - 0.5) * 20; // x
    particlePositions[i3 + 1] = 10 + Math.random() * 5; // y (above)
    particlePositions[i3 + 2] = -RACE_DISTANCE + (Math.random() - 0.5) * 5; // z

    // Random colors
    particleColors[i3] = Math.random();
    particleColors[i3 + 1] = Math.random();
    particleColors[i3 + 2] = Math.random();
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3)
  );
  particleGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(particleColors, 3)
  );

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });

  const confetti = new THREE.Points(particleGeometry, particleMaterial);
  confetti.visible = false; // Hidden initially
  scene.add(confetti);

  // Store for later use
  window.finishConfetti = confetti;
}

// Update animated objects
function updateAnimatedObjects(deltaTime) {
  // Update flag animations
  if (window.animatedFlags) {
    window.animatedFlags.forEach((flag) => {
      const anim = flag.userData.animation;
      anim.time += deltaTime;
      flag.rotation.z =
        anim.initialRotation +
        Math.sin(anim.time * anim.waveSpeed) * anim.waveAmount;
    });
  }

  // Update confetti if active
  if (window.finishConfetti && window.finishConfetti.visible) {
    const positions = window.finishConfetti.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      // Apply gravity and random movement
      positions[i] += (Math.random() - 0.5) * 0.1; // x drift
      positions[i + 1] -= 0.05; // y fall down
      positions[i + 2] += (Math.random() - 0.5) * 0.1; // z drift

      // Reset particles that fall below ground
      if (positions[i + 1] < 0) {
        positions[i + 1] = 10 + Math.random() * 5;
      }
    }

    window.finishConfetti.geometry.attributes.position.needsUpdate = true;
  }
}

// Check if car is outside track boundaries and handle
function checkBoundaries(car) {
  const halfTrackWidth = 15;
  if (car.position.x < -halfTrackWidth || car.position.x > halfTrackWidth) {
    if (car === playerCar) {
      gameState.speed *= 0.5;
      car.position.x = THREE.MathUtils.clamp(
        car.position.x,
        -halfTrackWidth,
        halfTrackWidth
      );
    } else {
      car.userData.speed *= 0.7;
      car.position.x = THREE.MathUtils.clamp(
        car.position.x,
        -halfTrackWidth,
        halfTrackWidth
      );
    }
  }
}

// Create FINISH text
function createFinishText(banner) {
  // Create canvas for text
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");

  // Fill background
  ctx.fillStyle = "#222222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add text
  ctx.font = "bold 80px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Add white outline
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6;
  ctx.strokeText("FINISH", canvas.width / 2, canvas.height / 2);

  // Fill with gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#ff0000");
  gradient.addColorStop(0.5, "#ffffff");
  gradient.addColorStop(1, "#ff0000");

  ctx.fillStyle = gradient;
  ctx.fillText("FINISH", canvas.width / 2, canvas.height / 2);

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);

  // Create material with texture
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
  });

  // Create plane for text (front side)
  const textGeometry = new THREE.PlaneGeometry(
    banner.geometry.parameters.width * 0.9,
    1.8
  );
  const textMesh = new THREE.Mesh(textGeometry, material);
  textMesh.position.set(0, banner.position.y, banner.position.z - 0.3);
  textMesh.rotation.y = Math.PI; // Face the approaching cars
  scene.add(textMesh);

  // Create plane for text (back side)
  const textMeshBack = new THREE.Mesh(textGeometry, material);
  textMeshBack.position.set(0, banner.position.y, banner.position.z + 0.3);
  scene.add(textMeshBack);
}

// Create finish zone decorations
function createFinishZoneDecorations() {
  const trackWidth = config.trackWidth || 20;
  const zoneLength = config.finish.stopDistance || 100;

  // Add flags on both sides of the finish zone
  for (let i = 0; i < 5; i++) {
    const zPos = -gameState.finishDistance - i * 20;

    // Left side flags
    createFlag(-trackWidth / 2 - 2, 0, zPos, 0xff0000); // Red flag

    // Right side flags
    createFlag(trackWidth / 2 + 2, 0, zPos, 0x0000ff); // Blue flag
  }

  // Add crowd/spectator elements
  createCrowd();
}

// Create a decorative flag
function createFlag(x, y, z, color) {
  // Flag pole
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
  const poleMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.set(x, y + 2.5, z);
  scene.add(pole);

  // Flag
  const flagGeometry = new THREE.PlaneGeometry(2, 1);
  const flagMaterial = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });

  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.position.set(x + 1, y + 4, z);

  // Add some random rotation to make it look like it's waving
  const waveSpeed = 0.5 + Math.random() * 0.5;
  const waveAmount = 0.1 + Math.random() * 0.2;
  const initialRotation = Math.random() * 0.2;

  flag.rotation.z = initialRotation;

  // Store animation parameters
  flag.userData = {
    animation: {
      waveSpeed: waveSpeed,
      waveAmount: waveAmount,
      initialRotation: initialRotation,
      time: Math.random() * 100, // Random start time for variety
    },
  };

  scene.add(flag);

  // Add to animated objects
  if (!window.animatedObjects) window.animatedObjects = [];
  window.animatedObjects.push(flag);

  return flag;
}

// Create crowd/spectator elements
function createCrowd() {
  const trackWidth = config.trackWidth || 20;
  const crowdDepth = 10;

  // Create crowd on both sides of the finish line
  for (let side = -1; side <= 1; side += 2) {
    const xPos = side * (trackWidth / 2 + crowdDepth / 2 + 2);

    // Create crowd area
    const crowdGeometry = new THREE.BoxGeometry(crowdDepth, 3, 40);
    const crowdTexture = createCrowdTexture();

    const crowdMaterial = new THREE.MeshBasicMaterial({
      map: crowdTexture,
      transparent: true,
      opacity: 0.9,
    });

    const crowd = new THREE.Mesh(crowdGeometry, crowdMaterial);
    crowd.position.set(xPos, 1.5, -gameState.finishDistance - 20);
    scene.add(crowd);
  }
}

// Create crowd texture
function createCrowdTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");

  // Fill background
  ctx.fillStyle = "#333333";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw crowd as colorful dots
  const colors = [
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff",
    "#ffffff",
  ];

  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 2 + Math.random() * 4;

    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Create finish particles (confetti)
function createFinishParticles() {
  const particleCount = 500;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);

  // Initialize particles above finish line
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // Position (random above finish line)
    particlePositions[i3] = (Math.random() - 0.5) * 20; // x
    particlePositions[i3 + 1] = 10 + Math.random() * 5; // y (above)
    particlePositions[i3 + 2] =
      -gameState.finishDistance + (Math.random() - 0.5) * 5; // z

    // Random colors
    particleColors[i3] = Math.random();
    particleColors[i3 + 1] = Math.random();
    particleColors[i3 + 2] = Math.random();
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3)
  );
  particleGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(particleColors, 3)
  );

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });

  const confetti = new THREE.Points(particleGeometry, particleMaterial);
  confetti.visible = false; // Hidden initially
  scene.add(confetti);

  // Store for later use
  window.finishConfetti = confetti;
}

// Update animated objects (call this from your animation loop)
function updateAnimatedObjects(deltaTime) {
  // Update flag animations
  if (window.animatedObjects) {
    window.animatedObjects.forEach((obj) => {
      if (obj.userData && obj.userData.animation) {
        const anim = obj.userData.animation;
        anim.time += deltaTime;
        obj.rotation.z =
          anim.initialRotation +
          Math.sin(anim.time * anim.waveSpeed) * anim.waveAmount;
      }
    });
  }

  // Update confetti if active
  if (window.finishConfetti && window.finishConfetti.visible) {
    const positions = window.finishConfetti.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      // Apply gravity and random movement
      positions[i] += (Math.random() - 0.5) * 0.1; // x drift
      positions[i + 1] -= 0.05; // y fall down
      positions[i + 2] += (Math.random() - 0.5) * 0.1; // z drift

      // Reset particles that fall below ground
      if (positions[i + 1] < 0) {
        positions[i + 1] = 10 + Math.random() * 5;
        positions[i] = (Math.random() - 0.5) * 20;
        positions[i + 2] =
          -gameState.finishDistance + (Math.random() - 0.5) * 5;
      }
    }

    window.finishConfetti.geometry.attributes.position.needsUpdate = true;
  }
}
