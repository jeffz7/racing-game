// Track creation and management

// Track configuration
const trackConfig = {
  width: 10,
  length: 1000,
  finishDistance: 900,
  barrierHeight: 1,
  barrierWidth: 0.5,
};

// Create track
function createTrack() {
  console.log("Creating track...");

  // Create track container
  const track = new THREE.Object3D();

  // Create road
  const roadGeometry = new THREE.PlaneGeometry(
    trackConfig.width,
    trackConfig.length
  );
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
  });
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.position.z = -trackConfig.length / 2; // Center the road
  track.add(road);

  // Create road markings
  const markingGeometry = new THREE.PlaneGeometry(0.2, 5);
  const markingMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
  });

  // Add markings along the road
  for (let i = 0; i < trackConfig.length / 10; i++) {
    const marking = new THREE.Mesh(markingGeometry, markingMaterial);
    marking.rotation.x = -Math.PI / 2;
    marking.position.z = -(trackConfig.length - 5) + i * 10; // Space markings every 10 units
    marking.position.y = 0.01; // Slightly above road to prevent z-fighting
    track.add(marking);
  }

  // Create finish line
  const finishLineGeometry = new THREE.PlaneGeometry(trackConfig.width, 2);
  const finishLineMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
  });
  const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
  finishLine.rotation.x = -Math.PI / 2;
  finishLine.position.z = -gameState.finishDistance;
  finishLine.position.y = 0.02; // Slightly above road
  track.add(finishLine);

  // Create side barriers
  const barrierGeometry = new THREE.BoxGeometry(
    trackConfig.barrierWidth,
    trackConfig.barrierHeight,
    trackConfig.length
  );
  const barrierMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    roughness: 0.7,
  });

  // Left barrier
  const leftBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
  leftBarrier.position.x = -(
    trackConfig.width / 2 +
    trackConfig.barrierWidth / 2
  );
  leftBarrier.position.y = trackConfig.barrierHeight / 2;
  leftBarrier.position.z = -trackConfig.length / 2;
  track.add(leftBarrier);

  // Right barrier
  const rightBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
  rightBarrier.position.x =
    trackConfig.width / 2 + trackConfig.barrierWidth / 2;
  rightBarrier.position.y = trackConfig.barrierHeight / 2;
  rightBarrier.position.z = -trackConfig.length / 2;
  track.add(rightBarrier);

  console.log("Track created");
  return track;
}

// Export functions and config
window.createTrack = createTrack;
window.trackConfig = trackConfig;
