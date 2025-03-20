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

// Create a finish line
function createFinishLine(trackWidth, zPosition) {
  // Create a checkered pattern for the finish line
  const segments = 20;
  const segmentWidth = trackWidth / segments;

  for (let i = 0; i < segments; i++) {
    const xPosition = -trackWidth / 2 + i * segmentWidth + segmentWidth / 2;
    const color = i % 2 === 0 ? 0xffffff : 0x000000; // Alternate white and black

    const finishLineSegment = new THREE.Mesh(
      new THREE.PlaneGeometry(segmentWidth, 3),
      new THREE.MeshBasicMaterial({ color: color })
    );

    finishLineSegment.rotation.x = -Math.PI / 2;
    finishLineSegment.position.set(xPosition, 0.05, zPosition);
    scene.add(finishLineSegment);
  }

  // Add "FINISH" text on the road
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 128;

  // Draw FINISH text
  context.fillStyle = "#ffcc00"; // Gold background
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = "Bold 96px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#000000"; // Black text
  context.fillText("FINISH", canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const textMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });

  const finishText = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2.5),
    textMaterial
  );

  finishText.rotation.x = -Math.PI / 2;
  finishText.position.set(0, 0.06, zPosition + 5);
  scene.add(finishText);

  // Add finish banner
  const bannerStand1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 8, 0.5),
    new THREE.MeshPhongMaterial({ color: 0x888888 })
  );

  bannerStand1.position.set(-trackWidth / 2 - 1, 4, zPosition);
  scene.add(bannerStand1);

  const bannerStand2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 8, 0.5),
    new THREE.MeshPhongMaterial({ color: 0x888888 })
  );

  bannerStand2.position.set(trackWidth / 2 + 1, 4, zPosition);
  scene.add(bannerStand2);

  // Create finish banner
  const bannerCanvas = document.createElement("canvas");
  const bannerContext = bannerCanvas.getContext("2d");
  bannerCanvas.width = 1024;
  bannerCanvas.height = 256;

  // Draw checkered pattern
  const checkerSize = 32;
  for (let x = 0; x < bannerCanvas.width; x += checkerSize) {
    for (let y = 0; y < bannerCanvas.height; y += checkerSize) {
      bannerContext.fillStyle =
        (x / checkerSize + y / checkerSize) % 2 === 0 ? "#ffffff" : "#000000";
      bannerContext.fillRect(x, y, checkerSize, checkerSize);
    }
  }

  // Add "FINISH" text
  bannerContext.font = "Bold 128px Arial";
  bannerContext.textAlign = "center";
  bannerContext.textBaseline = "middle";
  bannerContext.fillStyle = "#ff0000"; // Red text
  bannerContext.strokeStyle = "#ffffff"; // White outline
  bannerContext.lineWidth = 8;
  bannerContext.strokeText(
    "FINISH",
    bannerCanvas.width / 2,
    bannerCanvas.height / 2
  );
  bannerContext.fillText(
    "FINISH",
    bannerCanvas.width / 2,
    bannerCanvas.height / 2
  );

  const bannerTexture = new THREE.CanvasTexture(bannerCanvas);
  const bannerMaterial = new THREE.MeshBasicMaterial({
    map: bannerTexture,
    side: THREE.DoubleSide,
  });

  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(trackWidth + 4, 2),
    bannerMaterial
  );

  banner.position.set(0, 7, zPosition);
  scene.add(banner);
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
