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
  const speedDisplay = document.getElementById("speed");
  if (speedDisplay) {
    speedDisplay.textContent = Math.round(gameState.speed);
  }

  const maxSpeedDisplay = document.getElementById("maxSpeed");
  if (maxSpeedDisplay) {
    maxSpeedDisplay.textContent = Math.round(gameState.maxSpeed);
  }

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
  const tachometerFill = document.getElementById("tachometer-fill");
  if (tachometerFill) {
    tachometerFill.style.width = `${gameState.rpm}%`;
  }

  // Update time display
  if (gameState.started && !gameState.finished) {
    gameState.currentTime = Date.now() - gameState.startTime;
  }

  const timeDisplay = document.getElementById("time");
  if (timeDisplay) {
    const minutes = Math.floor(gameState.currentTime / 60000);
    const seconds = Math.floor((gameState.currentTime % 60000) / 1000);
    const milliseconds = Math.floor((gameState.currentTime % 1000) / 10);

    timeDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
  }

  // Update distance indicator
  const distanceDisplay = document.getElementById("distance");
  const distanceBarFill = document.getElementById("distance-bar-fill");
  if (distanceDisplay && distanceBarFill) {
    const distancePercent = Math.min(
      100,
      (gameState.distance / gameState.finishDistance) * 100
    );
    distanceDisplay.textContent = `${Math.round(distancePercent)}%`;
    distanceBarFill.style.width = `${distancePercent}%`;
  }

  // Update wheelspin indicator
  const wheelspinIndicator = document.getElementById("wheelspin-indicator");
  if (wheelspinIndicator) {
    if (gameState.wheelspin > 0.5) {
      wheelspinIndicator.style.display = "block";
      wheelspinIndicator.style.opacity = Math.min(1, gameState.wheelspin);
    } else {
      wheelspinIndicator.style.display = "none";
    }
  }

  // Update leaderboard
  updateLeaderboard();
}

// Update leaderboard with all players (including AI)
function updateLeaderboard() {
  const positions = document.getElementById("positions");
  if (!positions) return;

  positions.innerHTML = "";

  // Create array of all players (local + remote + AI)
  const allPlayers = [];

  // Add local player
  allPlayers.push({
    id: gameState.isMultiplayer ? window.multiplayer.socket.id : "local",
    name: gameState.isMultiplayer ? window.multiplayer.playerName : "YOU",
    distance: gameState.distance,
    finished: gameState.finished,
    isLocal: true,
  });

  // Add remote players in multiplayer mode
  if (gameState.isMultiplayer && window.multiplayer) {
    // Add remote players
    Object.values(window.multiplayer.otherPlayers).forEach((player) => {
      allPlayers.push({
        id: player.id,
        name: player.name,
        distance: player.distance || 0,
        finished: player.finished || false,
        isLocal: false,
      });
    });

    // Add AI cars in multiplayer mode
    if (window.multiplayer.aiCars) {
      window.multiplayer.aiCars.forEach((aiCar, index) => {
        allPlayers.push({
          id: `ai-${index}`,
          name: aiCar.name,
          distance: aiCar.distance || 0,
          finished: aiCar.finished || false,
          isLocal: false,
          isAI: true,
        });
      });
    }
  } else if (window.aiCars) {
    // Add AI cars in single player mode
    window.aiCars.forEach((car, index) => {
      allPlayers.push({
        id: `ai-${index}`,
        name: car.name,
        distance: car.distance || 0,
        finished: car.finished || false,
        isLocal: false,
        isAI: true,
      });
    });
  }

  // Sort players by distance (descending)
  allPlayers.sort((a, b) => b.distance - a.distance);

  // Add players to leaderboard
  allPlayers.forEach((player, index) => {
    const position = document.createElement("div");
    position.className = "position";

    // Add position number
    const posNumber = document.createElement("div");
    posNumber.className = "pos-number";
    posNumber.textContent = index + 1;
    position.appendChild(posNumber);

    // Add player name
    const posName = document.createElement("div");
    posName.className = "pos-name";

    // Highlight local player
    if (player.isLocal) {
      posName.classList.add("local-player");
    }

    // Add AI indicator
    if (player.isAI) {
      posName.classList.add("ai-player");
    }

    posName.textContent = player.name;
    position.appendChild(posName);

    // Add finished indicator
    if (player.finished) {
      const finishedIndicator = document.createElement("div");
      finishedIndicator.className = "finished-indicator";
      finishedIndicator.textContent = "✓";
      position.appendChild(finishedIndicator);
    }

    positions.appendChild(position);
  });
}

// Show player finished notification
function showPlayerFinished(data) {
  const notification = document.createElement("div");
  notification.style.position = "absolute";
  notification.style.top = "20%";
  notification.style.left = "50%";
  notification.style.transform = "translateX(-50%)";
  notification.style.padding = "10px 20px";
  notification.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  notification.style.color = "white";
  notification.style.borderRadius = "5px";
  notification.style.fontSize = "18px";
  notification.style.zIndex = "100";

  const minutes = Math.floor(data.time / 60000);
  const seconds = Math.floor((data.time % 60000) / 1000);
  const milliseconds = data.time % 1000;
  const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;

  notification.textContent = `${data.name} finished in position ${data.position}! Time: ${timeFormatted}`;

  document.getElementById("gameContainer").appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Show race results
function showRaceResults(finishOrder) {
  const gameOverModal = document.getElementById("gameOverModal");
  const raceStats = document.getElementById("raceStats");

  if (!gameOverModal || !raceStats) {
    console.error("Game over modal elements not found");
    return;
  }

  raceStats.innerHTML = "<h3>Final Results</h3>";

  finishOrder.forEach((player, index) => {
    const minutes = Math.floor(player.time / 60000);
    const seconds = Math.floor((player.time % 60000) / 1000);
    const milliseconds = player.time % 1000;
    const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;

    const isLocalPlayer = gameState.isMultiplayer
      ? player.id === window.multiplayer.socket.id
      : player.id === "local";

    const playerDiv = document.createElement("div");
    playerDiv.className = "result-entry";
    playerDiv.innerHTML = `<span class="position">${
      index + 1
    }.</span> <span class="name">${
      player.name
    }</span> <span class="time">${timeFormatted}</span>`;

    if (isLocalPlayer) {
      playerDiv.classList.add("local-player");
      playerDiv.style.fontWeight = "bold";
      playerDiv.style.color = "#ffff00";
    } else if (player.isAI) {
      playerDiv.style.color = "#00ff00"; // Green for AI
    }

    raceStats.appendChild(playerDiv);
  });

  gameOverModal.style.display = "flex";
}

// Show lap notification
function showLapNotification(lap) {
  const notification = document.createElement("div");
  notification.style.position = "absolute";
  notification.style.top = "30%";
  notification.style.left = "50%";
  notification.style.transform = "translateX(-50%)";
  notification.style.padding = "15px 30px";
  notification.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  notification.style.color = "white";
  notification.style.borderRadius = "5px";
  notification.style.fontSize = "24px";
  notification.style.zIndex = "100";

  notification.textContent = `Lap ${lap}/3`;

  document.getElementById("gameContainer").appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
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

// Add distance indicator to HUD
function addDistanceIndicator() {
  const hud = document.getElementById("hud");
  if (!hud) return;

  // Check if distance indicator already exists
  if (document.getElementById("distance")) return;

  const distanceContainer = document.createElement("div");
  distanceContainer.className = "distance-container";
  distanceContainer.style.marginTop = "10px";

  const distanceLabel = document.createElement("div");
  distanceLabel.textContent = "Progress: ";
  distanceLabel.style.marginRight = "5px";

  const distanceValue = document.createElement("span");
  distanceValue.id = "distance";
  distanceValue.textContent = "0%";

  const distanceBar = document.createElement("div");
  distanceBar.className = "distance-bar";
  distanceBar.style.width = "100%";
  distanceBar.style.height = "10px";
  distanceBar.style.backgroundColor = "#333";
  distanceBar.style.borderRadius = "5px";
  distanceBar.style.overflow = "hidden";
  distanceBar.style.marginTop = "5px";

  const distanceBarFill = document.createElement("div");
  distanceBarFill.id = "distance-bar-fill";
  distanceBarFill.style.width = "0%";
  distanceBarFill.style.height = "100%";
  distanceBarFill.style.backgroundColor = "#4CAF50";

  distanceBar.appendChild(distanceBarFill);
  distanceLabel.appendChild(distanceValue);
  distanceContainer.appendChild(distanceLabel);
  distanceContainer.appendChild(distanceBar);

  hud.appendChild(distanceContainer);
}

// Show countdown
function showCountdown(callback) {
  console.log("Starting countdown...");

  const countdownElement = document.getElementById("countdown");
  if (!countdownElement) {
    console.error("Countdown element not found!");
    return;
  }

  // Clear any existing countdown
  countdownElement.innerHTML = "";
  countdownElement.style.display = "flex";

  // Set countdown values
  const countdownValues = ["3", "2", "1", "GO!"];
  let index = 0;

  // Show first value
  countdownElement.textContent = countdownValues[index];
  console.log(`Countdown: ${countdownValues[index]}`);

  // Start countdown interval
  const interval = setInterval(() => {
    index++;

    if (index < countdownValues.length) {
      // Show next value
      countdownElement.textContent = countdownValues[index];
      console.log(`Countdown: ${countdownValues[index]}`);
    } else {
      // End countdown
      clearInterval(interval);
      countdownElement.style.display = "none";
      console.log("Countdown finished, starting race");

      // Call callback
      if (callback) callback();
    }
  }, 1000);
}

// Function to start the race
function startRace() {
  gameState.started = true;
  gameState.startTime = Date.now();

  // Add distance indicator if not already present
  addDistanceIndicator();

  // Play start sound if available
  if (typeof playSound === "function") {
    playSound("start");
  }

  console.log("Race started!");
}

// Show ready button for multiplayer
function showReadyButton() {
  const readyButton = document.getElementById("ready-button");
  if (readyButton) {
    readyButton.style.display = "block";

    // Add event listener
    const btnReady = document.getElementById("btn-ready");
    if (btnReady) {
      // Change button text for host
      if (window.multiplayer && window.multiplayer.isHost) {
        btnReady.textContent = "Start Race";
        btnReady.classList.add("host-button");
      } else {
        btnReady.textContent = "Ready";
      }

      btnReady.addEventListener("click", () => {
        if (window.multiplayer) {
          window.multiplayer.sendReady();
        }
      });
    }
  }

  // Show Add AI button for host
  showAddAIButton();
}

// Show connection status
function showConnectionStatus(status, message) {
  const connectionStatus = document.getElementById("connection-status");
  if (connectionStatus) {
    connectionStatus.textContent = message;
    connectionStatus.className = "connection-status " + status;
  }
}

// Show finish message
function showFinishMessage() {
  const countdownElement = document.getElementById("countdown");
  if (!countdownElement) return;

  // Show finish message
  countdownElement.textContent = "FINISH!";
  countdownElement.style.display = "flex";

  // Hide after 3 seconds
  setTimeout(() => {
    countdownElement.style.display = "none";
  }, 3000);
}

// Initialize UI
function initUI() {
  console.log("Initializing UI...");

  // Show ready button in multiplayer mode
  if (gameState.isMultiplayer) {
    showReadyButton();
  }
}

// Call initUI when the page loads
window.addEventListener("DOMContentLoaded", initUI);

// UI management

// Update speedometer
function updateSpeedometer() {
  const speedElement = document.getElementById("speed");
  if (speedElement) {
    // Convert speed to km/h (adjust multiplier as needed)
    const speedKmh = Math.round(gameState.speed * 3.6);
    speedElement.textContent = speedKmh;
  }
}

// Update tachometer
function updateTachometer() {
  const rpmElement = document.getElementById("rpm");
  if (rpmElement) {
    const rpmValue = Math.round(gameState.rpm);
    rpmElement.textContent = rpmValue;

    // Update tachometer visual (if exists)
    const tachNeedle = document.getElementById("tach-needle");
    if (tachNeedle) {
      // Calculate rotation based on RPM (0 to maxRPM)
      const maxRotation = 240; // Degrees of rotation for max RPM
      const rotation = (gameState.rpm / gameState.maxRPM) * maxRotation;
      tachNeedle.style.transform = `rotate(${rotation}deg)`;
    }

    // Change color when approaching redline
    if (gameState.rpm > gameState.redlineRPM) {
      rpmElement.style.color = "red";
    } else {
      rpmElement.style.color = "white";
    }
  }
}

// Update gear indicator
function updateGearIndicator() {
  const gearElement = document.getElementById("gear");
  if (gearElement) {
    let gearText;
    switch (gameState.currentGear) {
      case -1:
        gearText = "R";
        break;
      case 0:
        gearText = "N";
        break;
      default:
        gearText = gameState.currentGear;
    }
    gearElement.textContent = gearText;
  }
}

// Export functions
window.updateSpeedometer = updateSpeedometer;
window.updateTachometer = updateTachometer;
window.updateGearIndicator = updateGearIndicator;
window.updateLeaderboard = updateLeaderboard;
window.showReadyButton = showReadyButton;
window.showCountdown = showCountdown;
window.showConnectionStatus = showConnectionStatus;
window.showFinishMessage = showFinishMessage;

// Add this function to create an "Add AI" button for the host
function showAddAIButton() {
  // Only show for host
  if (
    !gameState.isMultiplayer ||
    !window.multiplayer ||
    !window.multiplayer.isHost
  ) {
    return;
  }

  // Create button container if it doesn't exist
  let addAIButton = document.getElementById("add-ai-button");

  if (!addAIButton) {
    addAIButton = document.createElement("div");
    addAIButton.id = "add-ai-button";
    addAIButton.style.position = "absolute";
    addAIButton.style.bottom = "80px";
    addAIButton.style.right = "20px";

    const button = document.createElement("button");
    button.textContent = "Add AI Car";
    button.onclick = () => {
      if (window.multiplayer && window.multiplayer.connection) {
        window.multiplayer.connection.addAICars(1);
      }
    };

    addAIButton.appendChild(button);
    document.getElementById("ui").appendChild(addAIButton);
  }
}
