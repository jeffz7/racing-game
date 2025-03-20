// Format time as MM:SS.ms
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const millis = ms % 1000;

  return `${minutes.toString().padStart(2, "0")}:${(seconds % 60)
    .toString()
    .padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Simple camera shake effect
function shakeCamera(intensity) {
  const originalPosition = camera.position.clone();
  const shake = () => {
    camera.position.x = originalPosition.x + (Math.random() - 0.5) * intensity;
    camera.position.y = originalPosition.y + (Math.random() - 0.5) * intensity;
  };

  // Shake for a short duration
  shake();
  setTimeout(() => shake(), 50);
  setTimeout(() => shake(), 100);
  setTimeout(() => {
    camera.position.copy(originalPosition);
  }, 150);
}

// Play collision sound
function playCollisionSound() {
  // If you have audio implemented, play a sound here
  console.log("Collision sound!");
}

// Update exhaust particles
function updateExhaustParticles(car, isAccelerating, rpm) {
  const particles = car.userData.exhaustParticles;
  if (!particles) return;

  // Determine if we should emit particles
  const shouldEmit = isAccelerating && rpm > 60;

  // Update existing particles
  particles.children.forEach((particle) => {
    if (particle.userData.life > 0) {
      // Update particle position
      particle.position.add(particle.userData.velocity);

      // Update particle life
      particle.userData.life--;

      // Update opacity based on remaining life
      const lifeRatio = particle.userData.life / particle.userData.maxLife;
      particle.material.opacity = lifeRatio * 0.7;

      // Grow particle slightly as it ages
      const scale = 1 + (1 - lifeRatio) * 2;
      particle.scale.set(scale, scale, scale);
    } else {
      // Hide dead particles
      particle.visible = false;
    }
  });

  // Emit new particles if accelerating
  if (shouldEmit && Math.random() < 0.3) {
    // Find a dead particle to reuse
    const deadParticles = particles.children.filter(
      (p) => p.userData.life <= 0
    );
    if (deadParticles.length > 0) {
      const particle =
        deadParticles[Math.floor(Math.random() * deadParticles.length)];

      // Reset particle
      particle.position.set(0, 0, 0);
      particle.scale.set(1, 1, 1);
      particle.visible = true;

      // Set random velocity
      particle.userData.velocity.set(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        -0.05 - Math.random() * 0.05 - (rpm / 100) * 0.1
      );

      // Set life based on RPM
      particle.userData.life = particle.userData.maxLife =
        20 + Math.random() * 10 + (rpm / 100) * 20;

      // Set color based on RPM (higher RPM = darker smoke)
      const colorValue = Math.max(0.3, 1 - (rpm / 100) * 0.7);
      particle.material.color.setRGB(colorValue, colorValue, colorValue);
    }
  }
}
