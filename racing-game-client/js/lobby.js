// Lobby functionality with improved flow

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements - Step containers
  const modeSelection = document.getElementById("mode-selection");
  const createGameForm = document.getElementById("create-game-form");
  const joinGameForm = document.getElementById("join-game-form");
  const singlePlayerForm = document.getElementById("single-player-form");

  // Get DOM elements - Mode selection buttons
  const btnCreateGame = document.getElementById("btn-create-game");
  const btnJoinGame = document.getElementById("btn-join-game");
  const btnSinglePlayer = document.getElementById("btn-single-player");

  // Get DOM elements - Back buttons
  const btnBackFromCreate = document.getElementById("btn-back-from-create");
  const btnBackFromJoin = document.getElementById("btn-back-from-join");
  const btnBackFromSingle = document.getElementById("btn-back-from-single");

  // Get DOM elements - Confirm buttons
  const btnCreateConfirm = document.getElementById("btn-create-confirm");
  const btnJoinConfirm = document.getElementById("btn-join-confirm");
  const btnSingleConfirm = document.getElementById("btn-single-confirm");

  // Get DOM elements - Form inputs
  const createPlayerName = document.getElementById("create-player-name");
  const createServerUrl = document.getElementById("create-server-url");

  const joinPlayerName = document.getElementById("join-player-name");
  const joinServerUrl = document.getElementById("join-server-url");
  const joinGameId = document.getElementById("join-game-id");

  const singlePlayerName = document.getElementById("single-player-name");

  const statusElement = document.getElementById("status");

  // Load saved player name if available
  const savedPlayerName = localStorage.getItem("playerName");
  if (savedPlayerName) {
    createPlayerName.value = savedPlayerName;
    joinPlayerName.value = savedPlayerName;
    singlePlayerName.value = savedPlayerName;
  }

  // Configure join game ID input to automatically convert to uppercase
  if (joinGameId) {
    joinGameId.addEventListener("input", function () {
      // Convert to uppercase and remove non-alphanumeric characters
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

      // Limit to 5 characters
      if (this.value.length > 5) {
        this.value = this.value.substring(0, 5);
      }
    });

    // Add placeholder to indicate format
    joinGameId.placeholder = "5-char code (e.g. A12B3)";
  }

  // Show a specific step and hide others
  function showStep(stepElement) {
    // Hide all steps
    [modeSelection, createGameForm, joinGameForm, singlePlayerForm].forEach(
      (element) => {
        element.classList.remove("active");
      }
    );

    // Show the requested step
    stepElement.classList.add("active");

    // Clear status
    statusElement.textContent = "";
    statusElement.className = "status";
  }

  // Mode selection button handlers
  btnCreateGame.addEventListener("click", () => {
    showStep(createGameForm);
  });

  btnJoinGame.addEventListener("click", () => {
    showStep(joinGameForm);
  });

  btnSinglePlayer.addEventListener("click", () => {
    showStep(singlePlayerForm);
  });

  // Back button handlers
  btnBackFromCreate.addEventListener("click", () => {
    showStep(modeSelection);
  });

  btnBackFromJoin.addEventListener("click", () => {
    showStep(modeSelection);
  });

  btnBackFromSingle.addEventListener("click", () => {
    showStep(modeSelection);
  });

  // Create game confirmation
  btnCreateConfirm.addEventListener("click", () => {
    const playerName = createPlayerName.value.trim();
    const serverUrl = createServerUrl.value.trim();

    if (!playerName) {
      showStatus("Please enter your name", "error");
      return;
    }

    if (!serverUrl) {
      showStatus("Please enter server URL", "error");
      return;
    }

    // Generate 5-character game ID (uppercase letters and numbers only)
    const gameId = generateGameId();

    // Save data to localStorage
    saveGameData(playerName, gameId, serverUrl);

    // Redirect to game
    showStatus(`Creating game ${gameId}...`, "info");

    // Display game code prominently before redirecting
    const codeDisplay = document.createElement("div");
    codeDisplay.className = "game-code-display";
    codeDisplay.innerHTML = `
      <div class="code-label">GAME CODE:</div>
      <div class="code-value">${gameId}</div>
      <div class="code-instruction">Share this code with other players</div>
    `;

    // Replace status with code display
    statusElement.innerHTML = "";
    statusElement.appendChild(codeDisplay);
    statusElement.className = "status info";

    setTimeout(() => {
      window.location.href = "game.html";
    }, 3000); // Give players more time to see and copy the code
  });

  // Join game confirmation
  btnJoinConfirm.addEventListener("click", () => {
    const playerName = joinPlayerName.value.trim();
    const serverUrl = joinServerUrl.value.trim();
    const gameId = joinGameId.value.trim().toUpperCase();

    if (!playerName) {
      showStatus("Please enter your name", "error");
      return;
    }

    if (!serverUrl) {
      showStatus("Please enter server URL", "error");
      return;
    }

    if (!gameId || gameId.length !== 5) {
      showStatus("Please enter a valid 5-character game code", "error");
      return;
    }

    // Save data to localStorage
    saveGameData(playerName, gameId, serverUrl);

    // Redirect to game
    showStatus(`Joining game ${gameId}...`, "info");
    setTimeout(() => {
      window.location.href = "game.html";
    }, 1000);
  });

  // Single player confirmation
  btnSingleConfirm.addEventListener("click", () => {
    const playerName = singlePlayerName.value.trim();

    if (!playerName) {
      showStatus("Please enter your name", "error");
      return;
    }

    // Save player name to localStorage
    localStorage.setItem("playerName", playerName);

    // Clear multiplayer data
    localStorage.removeItem("gameId");
    localStorage.removeItem("serverUrl");

    // Redirect to game
    showStatus("Starting single player mode...", "info");
    setTimeout(() => {
      window.location.href = "game.html";
    }, 1000);
  });

  // Helper functions
  function showStatus(message, type) {
    statusElement.textContent = message;
    statusElement.className = "status " + type;
  }

  // Generate a 5-character game ID with only uppercase letters and numbers
  function generateGameId() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar-looking characters (I, O, 0, 1)
    let result = "";

    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    return result;
  }

  function saveGameData(playerName, gameId, serverUrl) {
    localStorage.setItem("playerName", playerName);
    localStorage.setItem("gameId", gameId);
    localStorage.setItem("serverUrl", serverUrl);
  }
});
