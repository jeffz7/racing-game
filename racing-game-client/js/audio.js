// Audio context and sounds
let audioContext;
let soundElements = {};
let sounds = {};
let engineSound;
let isEngineRunning = false;
let isAccelerating = false;
let isBraking = false;
let gearShiftSound;
let tireSquealSound;

// Initialize audio system
function initAudio() {
  console.log("Initializing audio...");

  // Create audio context
  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Load all sound effects
  loadSounds();

  // Create engine sound
  createEngineSound();

  // Create gear shift sound
  gearShiftSound = new Audio("sounds/gear_shift.mp3");
  tireSquealSound = new Audio("sounds/wheelspin.mp3");
  tireSquealSound.loop = true;
  tireSquealSound.volume = 0;

  // Start engine sound
  engineSound.play().catch((error) => {
    console.warn("Could not play engine sound automatically:", error);
  });

  // Start tire squeal sound (with volume 0)
  tireSquealSound.play().catch((error) => {
    console.warn("Could not play tire squeal sound automatically:", error);
  });
}

// Load all sound effects
function loadSounds() {
  // List of sounds to load
  const soundFiles = {
    collision: "sounds/collision.mp3",
    brake: "sounds/brake.mp3",
    horn: "sounds/horn.mp3",
    finish: "sounds/finish.mp3",
    acceleration: "sounds/acceleration.mp3",
    idle: "sounds/idle.mp3",
    gear_shift: "sounds/gear_shift.mp3",
    wheelspin: "sounds/wheelspin.mp3", // Add wheelspin sound
  };

  // Load each sound
  Object.entries(soundFiles).forEach(([name, path]) => {
    loadSound(name, path);
  });
}

// Load a single sound using Audio elements instead of fetch
function loadSound(name, url) {
  // Create audio element
  const audio = new Audio();
  audio.src = url;

  // Store the element
  soundElements[name] = audio;

  // Preload the audio
  audio.load();
}

// Play a sound effect
function playSound(name, options = {}) {
  // Default options
  const defaults = {
    volume: 1.0,
    playbackRate: 1.0,
    loop: false,
  };

  // Merge options
  const settings = { ...defaults, ...options };

  // Check if sound exists
  if (!soundElements[name]) {
    console.warn(`Sound "${name}" not loaded yet`);
    return null;
  }

  // Clone the audio element to allow overlapping sounds
  const sound = soundElements[name].cloneNode();

  // Apply settings
  sound.volume = settings.volume;
  sound.playbackRate = settings.playbackRate;
  sound.loop = settings.loop;

  // Play the sound
  sound.play().catch((e) => console.warn("Error playing sound:", e));

  return sound;
}

// Create engine sound using oscillators and samples
function createEngineSound() {
  // Create oscillator for base engine sound
  const oscillator = audioContext.createOscillator();
  oscillator.type = "sawtooth";
  oscillator.frequency.value = 50; // Base frequency

  // Create gain node
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0; // Start silent

  // Create filter for more realistic engine sound
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  filter.Q.value = 10;

  // Connect nodes
  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Start oscillator
  oscillator.start();

  // Store references
  engineSound = {
    oscillator,
    gainNode,
    filter,
    idleSound: null,
    accelerationSound: null,
  };

  // Start idle sound loop
  engineSound.idleSound = playSound("idle", { volume: 0.2, loop: true });
}

// Update engine sound based on speed, key presses, and RPM
function updateEngineSound(
  speed,
  maxSpeed,
  isAcceleratorPressed,
  isBrakePressed,
  rpm
) {
  if (!engineSound) return;

  // Ensure audio context is running
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  // Calculate engine parameters based on RPM instead of just speed
  const normalizedSpeed = Math.abs(speed) / maxSpeed;
  const normalizedRPM = rpm / 100; // Convert 0-100 RPM to 0-1

  // Base frequency now depends more on RPM than speed
  const minFrequency = 50;
  const maxFrequency = 400;

  // More realistic frequency curve - exponential rise with RPM
  const frequencyFactor = Math.pow(normalizedRPM, 1.5); // Exponential curve
  const frequency =
    minFrequency + frequencyFactor * (maxFrequency - minFrequency);

  // Update oscillator frequency with smoother transition at high RPM
  const frequencyTransitionTime = normalizedRPM > 0.8 ? 0.05 : 0.1;
  engineSound.oscillator.frequency.setTargetAtTime(
    frequency,
    audioContext.currentTime,
    frequencyTransitionTime
  );

  // Update filter frequency - higher RPM = more high frequencies
  // More pronounced filter effect at high RPM
  const filterFreq = 300 + Math.pow(normalizedRPM, 2) * 1200;
  engineSound.filter.frequency.setTargetAtTime(
    filterFreq,
    audioContext.currentTime,
    0.1
  );

  // Base engine volume - more dynamic range
  let targetVolume = normalizedSpeed * 0.05 + normalizedRPM * 0.1;

  // Add volume variation based on throttle
  if (isAcceleratorPressed) {
    targetVolume += 0.05 + normalizedRPM * 0.05;
  }

  // Handle gear changing sound
  if (gameState.isChangingGear) {
    const changeProgress =
      (Date.now() - gameState.gearChangeStart) / config.gears.changeTime;

    // Add subtle volume dip during gear change
    if (changeProgress < 0.5) {
      targetVolume *= 1 - changeProgress * 0.3;
    } else {
      targetVolume *= 0.85 + (changeProgress - 0.5) * 0.3;
    }

    // Add slight pitch variation during gear change
    const pitchVariation = 1 - Math.sin(changeProgress * Math.PI) * 0.1;
    engineSound.oscillator.detune.setValueAtTime(
      pitchVariation * 100 - 100,
      audioContext.currentTime
    );
  } else {
    // Reset detune when not changing gears
    engineSound.oscillator.detune.setTargetAtTime(
      0,
      audioContext.currentTime,
      0.1
    );
  }

  // Handle acceleration sound
  if (isAcceleratorPressed && !isAccelerating && normalizedRPM > 0.7) {
    isAccelerating = true;

    // Play acceleration sound
    if (engineSound.accelerationSound) {
      engineSound.accelerationSound.pause();
    }

    // Adjust playback rate based on current RPM
    const playbackRate = 0.8 + normalizedRPM * 0.4;
    engineSound.accelerationSound = playSound("acceleration", {
      volume: 0.3 * normalizedRPM,
      playbackRate: playbackRate,
    });
  } else if (!isAcceleratorPressed && isAccelerating) {
    isAccelerating = false;
  }

  // Handle wheelspin sound
  if (gameState.wheelspin > 0.3 && Math.abs(speed) < 0.2) {
    if (!engineSound.wheelspinSound || !engineSound.wheelspinSound.playing) {
      engineSound.wheelspinSound = playSound("wheelspin", {
        volume: gameState.wheelspin * 0.4,
        playbackRate: 0.9 + gameState.wheelspin * 0.2,
        loop: true,
      });
      engineSound.wheelspinSound.playing = true;
    } else if (engineSound.wheelspinSound) {
      // Update volume based on wheelspin intensity
      engineSound.wheelspinSound.volume = gameState.wheelspin * 0.4;
    }
  } else if (engineSound.wheelspinSound && engineSound.wheelspinSound.playing) {
    engineSound.wheelspinSound.pause();
    engineSound.wheelspinSound.playing = false;
  }

  // Handle brake sound
  if (isBrakePressed && !isBraking && speed > 0.1) {
    isBraking = true;
    playSound("brake", { volume: Math.min(0.3 + normalizedSpeed * 0.4, 0.7) });
  } else if (!isBrakePressed && isBraking) {
    isBraking = false;
  }

  // Update engine volume with smoother transition
  engineSound.gainNode.gain.setTargetAtTime(
    targetVolume,
    audioContext.currentTime,
    0.1
  );

  // Update idle sound volume - quieter as RPM increases
  if (engineSound.idleSound) {
    engineSound.idleSound.volume = Math.max(0.2 - normalizedRPM * 0.15, 0.05);
  }

  // Track engine state
  if (normalizedSpeed > 0.01 && !isEngineRunning) {
    isEngineRunning = true;
  } else if (normalizedSpeed <= 0.01 && isEngineRunning) {
    isEngineRunning = false;
    engineSound.gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.5);
  }
}

// Play collision sound
function playCollisionSound() {
  // Randomize collision sound slightly
  const volume = 0.6 + Math.random() * 0.2;
  const pitch = 0.9 + Math.random() * 0.2;

  playSound("collision", {
    volume: volume,
    playbackRate: pitch,
  });
}

// Play brake sound
function playBrakeSound() {
  playSound("brake", { volume: 0.5 });
}

// Play horn sound
function playHornSound() {
  playSound("horn", { volume: 0.6 });
}

// Play finish sound
function playFinishSound() {
  playSound("finish", { volume: 1.0 });
}

// Play gear shift sound
function playGearShiftSound() {
  if (!gearShiftSound) return;

  // Clone the audio to allow overlapping sounds
  const sound = gearShiftSound.cloneNode();
  sound.volume = 0.5;

  sound.play().catch((error) => {
    console.warn("Could not play gear shift sound:", error);
  });
}

// Play tire squeal sound
function playTireSquealSound(intensity) {
  if (!tireSquealSound) return;

  // Set volume based on intensity (0-1)
  tireSquealSound.volume = Math.min(intensity, 1) * 0.5;
}

// Stop all sounds (for game reset)
function stopAllSounds() {
  // Silence engine
  if (engineSound) {
    engineSound.gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    // Stop looping sounds
    if (engineSound.idleSound) {
      engineSound.idleSound.pause();
    }
    if (engineSound.accelerationSound) {
      engineSound.accelerationSound.pause();
    }
  }

  // Stop any playing sound elements
  Object.values(soundElements).forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });

  // Reset state
  isAccelerating = false;
  isBraking = false;
}

// Initialize audio when the page loads
window.addEventListener("load", () => {
  // Initialize with a user interaction to satisfy autoplay policy
  const startAudioButton = document.createElement("button");
  startAudioButton.textContent = "Start Audio";
  startAudioButton.style.position = "absolute";
  startAudioButton.style.top = "10px";
  startAudioButton.style.right = "10px";
  startAudioButton.style.zIndex = "1000";

  startAudioButton.addEventListener("click", () => {
    initAudio();
    startAudioButton.remove();
  });

  document.body.appendChild(startAudioButton);
});

// Export functions
window.updateEngineSound = updateEngineSound;
window.playGearShiftSound = playGearShiftSound;
window.playTireSquealSound = playTireSquealSound;
window.stopAllSounds = stopAllSounds;
