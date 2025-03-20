// Camera management

// Global variables
let cameraFollowMode = true;
const cameraOffset = new THREE.Vector3(0, 5, 10); // Default camera position relative to car

// Update camera position
function updateCamera() {
  if (!playerCar) return;

  if (cameraFollowMode) {
    // Calculate camera target position (behind and above the car)
    const targetPosition = new THREE.Vector3();

    // Get car's forward direction
    const carDirection = new THREE.Vector3(0, 0, -1);
    carDirection.applyQuaternion(playerCar.quaternion);

    // Position camera behind the car
    targetPosition
      .copy(playerCar.position)
      .sub(carDirection.multiplyScalar(cameraOffset.z))
      .add(new THREE.Vector3(0, cameraOffset.y, 0));

    // Smoothly move camera to target position
    camera.position.lerp(targetPosition, 0.1);

    // Look at a point slightly ahead of the car
    const lookAtPosition = new THREE.Vector3();
    lookAtPosition.copy(playerCar.position).add(new THREE.Vector3(0, 1, 0)); // Look slightly above the car

    camera.lookAt(lookAtPosition);
  }
}

// Toggle camera mode
function toggleCameraMode() {
  cameraFollowMode = !cameraFollowMode;
  console.log(`Camera follow mode: ${cameraFollowMode}`);

  if (!cameraFollowMode) {
    // Reset to fixed camera position
    camera.position.set(0, 20, 0);
    camera.lookAt(0, 0, -100);
  }
}

// Export functions
window.updateCamera = updateCamera;
window.toggleCameraMode = toggleCameraMode;
