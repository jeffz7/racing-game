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

// Update leaderboard with multiplayer players
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
    Object.values(window.multiplayer.otherPlayers).forEach((player) => {
      allPlayers.push({
        id: player.id,
        name: player.name,
        distance: player.distance || 0,
        finished: player.finished || false,
        isLocal: false,
      });
    });
  } else if (window.aiCars) {
    // Add AI cars in single player mode
    window.aiCars.forEach((car, index) => {
      allPlayers.push({
        id: `ai-${index}`,
        name: car.userData.name,
        distance: car.userData.aiState ? car.userData.aiState.distance : 0,
        finished: car.userData.aiState ? car.userData.aiState.finished : false,
        isLocal: false,
      });
    });
  }

  // Sort players by distance (finished players at the top)
  allPlayers.sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    return b.distance - a.distance;
  });

  // Add players to leaderboard
  allPlayers.forEach((player, index) => {
    const position = document.createElement("div");
    position.className = "position";

    // Highlight local player
    if (player.isLocal) {
      position.classList.add("local-player");
    }

    // Format name
    let displayName = player.name;
    if (player.isLocal) {
      displayName += " (YOU)";
    }

    // Format distance
    const distance = player.distance ? Math.round(player.distance) : 0;

    // Create position content
    position.innerHTML = `
      <span class="pos">${index + 1}</span>
      <span class="name">${displayName}</span>
      <span class="distance">${distance}m</span>
    `;

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
function showCountdown() {
  const countdownOverlay = document.createElement("div");
  countdownOverlay.style.position = "absolute";
  countdownOverlay.style.top = "0";
  countdownOverlay.style.left = "0";
  countdownOverlay.style.width = "100%";
  countdownOverlay.style.height = "100%";
  countdownOverlay.style.display = "flex";
  countdownOverlay.style.justifyContent = "center";
  countdownOverlay.style.alignItems = "center";
  countdownOverlay.style.fontSize = "150px";
  countdownOverlay.style.color = "white";
  countdownOverlay.style.textShadow = "0 0 10px black";
  countdownOverlay.style.zIndex = "1000";

  document.getElementById("gameContainer").appendChild(countdownOverlay);

  let count = 3;
  countdownOverlay.textContent = count;

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownOverlay.textContent = count;
    } else if (count === 0) {
      countdownOverlay.textContent = "GO!";
    } else {
      clearInterval(interval);
      countdownOverlay.remove();

      // Start the race
      startRace();
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
  // Remove existing button if it exists
  const existingBtn = document.getElementById("readyBtn");
  if (existingBtn) {
    existingBtn.remove();
  }

  const readyBtn = document.createElement("button");
  readyBtn.id = "readyBtn";
  readyBtn.innerText = "Ready to Race!";
  readyBtn.style.position = "absolute";
  readyBtn.style.top = "50%";
  readyBtn.style.left = "50%";
  readyBtn.style.transform = "translate(-50%, -50%)";
  readyBtn.style.padding = "20px 40px";
  readyBtn.style.fontSize = "24px";
  readyBtn.style.backgroundColor = "#4CAF50";
  readyBtn.style.color = "white";
  readyBtn.style.border = "none";
  readyBtn.style.borderRadius = "10px";
  readyBtn.style.cursor = "pointer";
  readyBtn.style.zIndex = "1000";

  readyBtn.addEventListener("click", () => {
    if (window.multiplayer) {
      window.multiplayer.setReady();
      readyBtn.style.display = "none";

      // Show waiting message
      const waitingMsg = document.createElement("div");
      waitingMsg.id = "waitingMessage";
      waitingMsg.innerText = "Waiting for other players...";
      waitingMsg.style.position = "absolute";
      waitingMsg.style.top = "50%";
      waitingMsg.style.left = "50%";
      waitingMsg.style.transform = "translate(-50%, -50%)";
      waitingMsg.style.padding = "20px";
      waitingMsg.style.fontSize = "24px";
      waitingMsg.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      waitingMsg.style.color = "white";
      waitingMsg.style.borderRadius = "10px";
      waitingMsg.style.zIndex = "1000";

      document.getElementById("gameContainer").appendChild(waitingMsg);
    }
  });

  document.getElementById("gameContainer").appendChild(readyBtn);
}

// Show connection status
function showConnectionStatus(status, message) {
  // Remove existing status if it exists
  const existingStatus = document.getElementById("connectionStatus");
  if (existingStatus) {
    existingStatus.remove();
  }

  const statusDiv = document.createElement("div");
  statusDiv.id = "connectionStatus";
  statusDiv.innerText = message;
  statusDiv.style.position = "absolute";
  statusDiv.style.top = "10px";
  statusDiv.style.right = "10px";
  statusDiv.style.padding = "10px";
  statusDiv.style.borderRadius = "5px";
  statusDiv.style.zIndex = "1000";

  if (status === "connected") {
    statusDiv.style.backgroundColor = "rgba(0, 128, 0, 0.7)";
  } else if (status === "connecting") {
    statusDiv.style.backgroundColor = "rgba(255, 165, 0, 0.7)";
  } else {
    statusDiv.style.backgroundColor = "rgba(255, 0, 0, 0.7)";
  }

  document.getElementById("gameContainer").appendChild(statusDiv);

  // Auto-remove after 5 seconds if connected
  if (status === "connected") {
    setTimeout(() => {
      statusDiv.remove();
    }, 5000);
  }
}

// Add a debug panel to the UI
function addDebugPanel() {
  const debugPanel = document.createElement("div");
  debugPanel.id = "debugPanel";
  debugPanel.style.position = "absolute";
  debugPanel.style.bottom = "10px";
  debugPanel.style.left = "10px";
  debugPanel.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  debugPanel.style.color = "white";
  debugPanel.style.padding = "10px";
  debugPanel.style.borderRadius = "5px";
  debugPanel.style.fontFamily = "monospace";
  debugPanel.style.fontSize = "12px";
  debugPanel.style.maxWidth = "300px";
  debugPanel.style.maxHeight = "200px";
  debugPanel.style.overflow = "auto";
  debugPanel.style.zIndex = "1000";

  document.getElementById("gameContainer").appendChild(debugPanel);

  // Update debug info every 500ms
  setInterval(updateDebugInfo, 500);
}

function updateDebugInfo() {
  const debugPanel = document.getElementById("debugPanel");
  if (!debugPanel) return;

  let debugInfo = `
    <strong>Controls:</strong> ${JSON.stringify(gameState.controls)}<br>
    <strong>Speed:</strong> ${Math.round(gameState.speed)}<br>
    <strong>Acceleration:</strong> ${gameState.acceleration.toFixed(2)}<br>
    <strong>Gear:</strong> ${gameState.currentGear}<br>
    <strong>RPM:</strong> ${Math.round(gameState.rpm)}<br>
    <strong>Distance:</strong> ${gameState.distance.toFixed(2)}/${
    gameState.finishDistance
  }<br>
  `;

  if (gameState.isMultiplayer && window.multiplayer) {
    debugInfo += `
      <strong>Multiplayer:</strong> ${
        window.multiplayer.connected ? "Connected" : "Disconnected"
      }<br>
      <strong>Socket ID:</strong> ${window.multiplayer.socket?.id || "N/A"}<br>
      <strong>Game ID:</strong> ${window.multiplayer.gameId || "N/A"}<br>
      <strong>Other Players:</strong> ${
        Object.keys(window.multiplayer.otherPlayers).length
      }<br>
    `;
  }

  debugPanel.innerHTML = debugInfo;
}

// Initialize UI
function initUI() {
  // Add distance indicator
  addDistanceIndicator();

  // Set up restart button
  const restartBtn = document.getElementById("restartBtn");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      location.reload();
    });
  }

  // Set up audio start button
  const startAudioBtn = document.getElementById("startAudioBtn");
  if (startAudioBtn) {
    startAudioBtn.addEventListener("click", () => {
      document.getElementById("audioStartOverlay").style.display = "none";

      // Initialize audio if available
      if (typeof initAudio === "function") {
        initAudio();
      }

      // Start the game in single player mode
      if (!gameState.isMultiplayer) {
        startRace();
      }
    });
  }

  // Add debug panel
  addDebugPanel();

  console.log("UI initialized");
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

// Show ready button
function showReadyButton() {
  // Create ready button if it doesn't exist
  let readyButton = document.getElementById("readyButton");

  if (!readyButton) {
    readyButton = document.createElement("button");
    readyButton.id = "readyButton";
    readyButton.textContent = "Ready";
    readyButton.style.position = "fixed";
    readyButton.style.bottom = "20px";
    readyButton.style.left = "50%";
    readyButton.style.transform = "translateX(-50%)";
    readyButton.style.padding = "10px 20px";
    readyButton.style.fontSize = "18px";
    readyButton.style.backgroundColor = "#4CAF50";
    readyButton.style.color = "white";
    readyButton.style.border = "none";
    readyButton.style.borderRadius = "5px";
    readyButton.style.cursor = "pointer";
    readyButton.style.zIndex = "1000";

    // Add hover effects
    readyButton.onmouseover = function () {
      this.style.backgroundColor = "#45a049";
    };
    readyButton.onmouseout = function () {
      this.style.backgroundColor = "#4CAF50";
    };

    // Add click handler
    readyButton.onclick = function () {
      if (window.multiplayer && window.multiplayer.socket) {
        // Send ready signal to server
        window.multiplayer.socket.emit("playerReady");

        // Update button
        this.textContent = "Waiting for others...";
        this.disabled = true;
        this.style.backgroundColor = "#cccccc";
        this.style.cursor = "default";

        console.log("Player ready signal sent");
      }
    };

    document.body.appendChild(readyButton);
    console.log("Ready button added");
  }
}

// Show countdown
function showCountdown() {
  console.log("Showing countdown");

  // Create countdown element
  const countdown = document.createElement("div");
  countdown.id = "countdown";
  countdown.style.position = "fixed";
  countdown.style.top = "50%";
  countdown.style.left = "50%";
  countdown.style.transform = "translate(-50%, -50%)";
  countdown.style.fontSize = "100px";
  countdown.style.fontWeight = "bold";
  countdown.style.color = "white";
  countdown.style.textShadow = "0 0 10px black";
  countdown.style.zIndex = "1000";
  document.body.appendChild(countdown);

  // Start countdown
  let count = 3;
  countdown.textContent = count;

  const countdownInterval = setInterval(() => {
    count--;

    if (count > 0) {
      countdown.textContent = count;
    } else if (count === 0) {
      countdown.textContent = "GO!";

      // Start race
      gameState.started = true;
      gameState.raceStartTime = Date.now();

      // Hide ready button
      const readyButton = document.getElementById("readyButton");
      if (readyButton) {
        readyButton.style.display = "none";
      }
    } else {
      // Remove countdown element
      document.body.removeChild(countdown);
      clearInterval(countdownInterval);
    }
  }, 1000);
}

// Show connection status
function showConnectionStatus(status, message) {
  console.log(`Connection status: ${status} - ${message}`);

  // Create or update status element
  let statusElement = document.getElementById("connection-status");

  if (!statusElement) {
    statusElement = document.createElement("div");
    statusElement.id = "connection-status";
    statusElement.style.position = "fixed";
    statusElement.style.bottom = "10px";
    statusElement.style.right = "10px";
    statusElement.style.padding = "10px";
    statusElement.style.borderRadius = "5px";
    statusElement.style.fontFamily = "Arial, sans-serif";
    statusElement.style.zIndex = "1000";
    document.body.appendChild(statusElement);
  }

  // Set styles based on status
  switch (status) {
    case "connecting":
      statusElement.style.backgroundColor = "rgba(255, 165, 0, 0.8)"; // Orange
      break;
    case "connected":
      statusElement.style.backgroundColor = "rgba(0, 128, 0, 0.8)"; // Green
      // Hide after 3 seconds
      setTimeout(() => {
        statusElement.style.display = "none";
      }, 3000);
      break;
    case "error":
    case "disconnected":
      statusElement.style.backgroundColor = "rgba(255, 0, 0, 0.8)"; // Red
      break;
    default:
      statusElement.style.backgroundColor = "rgba(0, 0, 0, 0.8)"; // Black
  }

  statusElement.style.color = "white";
  statusElement.textContent = message;
  statusElement.style.display = "block";
}

// Show finish message
function showFinishMessage() {
  // Create finish message element
  const finishMessage = document.createElement("div");
  finishMessage.id = "finish-message";
  finishMessage.style.position = "fixed";
  finishMessage.style.top = "50%";
  finishMessage.style.left = "50%";
  finishMessage.style.transform = "translate(-50%, -50%)";
  finishMessage.style.fontSize = "60px";
  finishMessage.style.fontWeight = "bold";
  finishMessage.style.color = "white";
  finishMessage.style.textShadow = "0 0 10px black";
  finishMessage.style.zIndex = "1000";
  finishMessage.textContent = "FINISH!";
  document.body.appendChild(finishMessage);

  // Calculate race time
  if (gameState.raceStartTime) {
    const raceTime = (Date.now() - gameState.raceStartTime) / 1000;

    // Add race time to finish message
    const timeElement = document.createElement("div");
    timeElement.style.fontSize = "30px";
    timeElement.style.marginTop = "20px";
    timeElement.textContent = `Time: ${raceTime.toFixed(2)}s`;
    finishMessage.appendChild(timeElement);
  }

  // Hide after 5 seconds
  setTimeout(() => {
    finishMessage.style.display = "none";
  }, 5000);
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
