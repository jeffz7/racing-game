// Setup keyboard and touch input handlers
function setupInputHandlers() {
  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight"
    ) {
      keysPressed[e.key] = true;
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight"
    ) {
      keysPressed[e.key] = false;
      e.preventDefault();
    }
  });

  // Mobile touch controls
  const upBtn = document.getElementById("upBtn");
  const downBtn = document.getElementById("downBtn");
  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");

  // Helper function for touch events
  function addTouchHandlers(element, control) {
    element.addEventListener("touchstart", (e) => {
      e.preventDefault();
      touchControls[control] = true;
    });

    element.addEventListener("touchend", (e) => {
      e.preventDefault();
      touchControls[control] = false;
    });

    // For testing on desktop
    element.addEventListener("mousedown", (e) => {
      touchControls[control] = true;
    });

    element.addEventListener("mouseup", (e) => {
      touchControls[control] = false;
    });
  }

  addTouchHandlers(upBtn, "forward");
  addTouchHandlers(downBtn, "backward");
  addTouchHandlers(leftBtn, "left");
  addTouchHandlers(rightBtn, "right");

  // Restart button
  document.getElementById("restartBtn").addEventListener("click", resetGame);
}

// Update HUD elements
function updateHUD() {
  // Update speed display
  document.getElementById("speed").textContent = Math.round(
    gameState.speed * 120
  );
  document.getElementById("maxSpeed").textContent = Math.round(
    gameState.maxSpeed * 120
  );

  // Update gear display
  const gearDisplay = document.getElementById("gear");
  if (gearDisplay) {
    // Get gear name based on current gear
    let gearName;
    if (gameState.isChangingGear) {
      gearName = "..."; // Show dots when changing gear
    } else if (gameState.currentGear === -1) {
      gearName = "R";
    } else if (gameState.currentGear === 0) {
      gearName = "N";
    } else {
      gearName = gameState.currentGear.toString();
    }
    gearDisplay.textContent = gearName;

    // Add visual indicator for gear change
    if (gameState.isChangingGear) {
      gearDisplay.classList.add("changing-gear");
    } else {
      gearDisplay.classList.remove("changing-gear");
    }
  }

  // Update RPM display
  const rpmDisplay = document.getElementById("rpm");
  if (rpmDisplay) {
    rpmDisplay.textContent = Math.round(gameState.rpm);
  }

  // Update tachometer
  const tachometer = document.getElementById("tachometer-fill");
  if (tachometer) {
    tachometer.style.width = `${gameState.rpm}%`;

    // Change color based on RPM
    if (gameState.rpm > 80) {
      tachometer.style.backgroundColor = "#ff3300";
      tachometer.classList.add("redline");
    } else {
      tachometer.style.backgroundColor = "#33cc33";
      tachometer.classList.remove("redline");
    }
  }

  // Update wheelspin indicator if it exists
  const wheelspinIndicator = document.getElementById("wheelspin-indicator");
  if (wheelspinIndicator && gameState.wheelspin > 0.1) {
    wheelspinIndicator.style.opacity = gameState.wheelspin;
    wheelspinIndicator.style.display = "block";
  } else if (wheelspinIndicator) {
    wheelspinIndicator.style.display = "none";
  }

  // Update time
  if (gameState.started && !gameState.finished) {
    gameState.currentTime = Date.now() - gameState.startTime;
    document.getElementById("time").textContent = formatTime(
      gameState.currentTime
    );
  }

  // Update leaderboard
  updateLeaderboard();
}

// Update leaderboard with current positions
function updateLeaderboard() {
  if (!gameState.started) return;

  // Get all cars (player and AI)
  const allCars = [playerCar, ...aiCars];

  // Calculate positions based on z-position (further along track = higher position)
  const positions = allCars.map((car, index) => {
    const name = index === 0 ? "You" : car.userData.name || `AI Car ${index}`;
    return {
      name: name,
      position: car.position.z,
      finished: car.userData.finished || false,
      finishTime: car.userData.finishTime || 0,
    };
  });

  // Sort by position (finished cars first, then by z-position)
  positions.sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    return b.position - a.position; // Higher z = further along track
  });

  // Update positions display
  const positionsElement = document.getElementById("positions");
  if (positionsElement) {
    positionsElement.innerHTML = "";

    positions.forEach((car, index) => {
      const positionDiv = document.createElement("div");

      // Show finish time for finished cars
      let displayText = `${index + 1}. ${car.name}`;
      if (car.finished) {
        displayText += ` - ${formatTime(car.finishTime)}`;
      }

      positionDiv.textContent = displayText;

      // Highlight player's position
      if (car.name === "You") {
        positionDiv.style.fontWeight = "bold";
        positionDiv.style.color = "#ffff00";
      }

      positionsElement.appendChild(positionDiv);
    });
  }
}

// Format time in mm:ss.ms format
function formatTime(timeMs) {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const ms = timeMs % 1000;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

// Check if a car has finished the race
function checkFinish(car, name) {
  // Race is 1000 units long
  const finishLine = 1000;

  if (car.position.z >= finishLine && !car.userData.finished) {
    car.userData.finished = true;
    car.userData.finishTime = Date.now() - gameState.startTime;

    console.log(`${name} finished in ${formatTime(car.userData.finishTime)}`);

    // If player finished, show game over modal
    if (name === "You") {
      gameState.finished = true;

      // Play finish sound
      if (typeof playSound === "function") {
        playSound("finish");
      }

      // Show game over modal
      document.getElementById("gameOverModal").style.display = "flex";

      // Update race stats
      const raceStats = document.getElementById("raceStats");
      raceStats.innerHTML = `
        <p>Time: ${formatTime(car.userData.finishTime)}</p>
        <p>Max Speed: ${Math.round(gameState.maxSpeed * 120)} km/h</p>
      `;
    }
  }
}
