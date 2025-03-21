const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

// Create the Express app
const app = express();
app.use(cors());

// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // In production, restrict this to your client domain
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store active games and players
const games = {};
const players = {};
const gameTimeouts = {};

// AI car configuration
const MAX_CARS = 5;
const AI_UPDATE_INTERVAL = 100; // ms
const RACE_DISTANCE = 1000; // Distance to finish line

// Add AI cars to a game
function addAICar(gameId, aiName) {
  if (!games[gameId]) {
    console.error(`Game ${gameId} not found when adding AI car`);
    return null;
  }

  const game = games[gameId];

  // Calculate total cars (players + AI)
  const totalCars =
    game.players.length + (game.aiCars ? game.aiCars.length : 0);

  // Calculate starting position based on total car count
  // We'll arrange cars in a grid: 2 cars per row, with rows staggered
  const row = Math.floor(totalCars / 2);
  const column = totalCars % 2;

  // Grid spacing
  const columnSpacing = 3; // 3 units between cars in a row
  const rowSpacing = 5; // 5 units between rows

  // Calculate position
  const startPosition = {
    x: column === 0 ? -columnSpacing / 2 : columnSpacing / 2,
    y: 0,
    z: -row * rowSpacing,
  };

  // Create AI car
  const aiId = `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const aiCar = {
    id: aiId,
    name: aiName || `AI ${game.aiCars ? game.aiCars.length + 1 : 1}`,
    isAI: true,
    position: { ...startPosition },
    startPosition: startPosition,
    speed: 0,
    distance: 0,
    finished: false,
    // AI-specific properties
    targetSpeed: 60 + Math.random() * 40, // Random speed between 60-100
    acceleration: 5 + Math.random() * 5, // Random acceleration between 5-10
    lane: Math.floor(Math.random() * 2), // Random lane (0 or 1)
  };

  // Initialize aiCars array if it doesn't exist
  if (!game.aiCars) {
    game.aiCars = [];
  }

  // Add AI car to game
  game.aiCars.push(aiCar);

  console.log(
    `Added AI car ${aiCar.name} to game ${gameId} at position (${startPosition.x}, ${startPosition.y}, ${startPosition.z})`
  );

  // Notify all players in the game
  io.to(gameId).emit("aiCarAdded", {
    car: aiCar,
  });

  return aiCar;
}

// Update the addAICars function to add multiple AI cars
function addAICars(gameId, count) {
  if (!games[gameId]) {
    console.error(`Game ${gameId} not found when adding AI cars`);
    return;
  }

  console.log(`Adding ${count} AI cars to game ${gameId}`);

  for (let i = 0; i < count; i++) {
    addAICar(gameId, `AI ${i + 1}`);
  }
}

// Update AI car positions
function updateAICars(gameId) {
  if (
    !games[gameId] ||
    !games[gameId].aiCars ||
    games[gameId].aiCars.length === 0
  ) {
    return;
  }

  const game = games[gameId];

  // Update each AI car
  for (const aiCar of game.aiCars) {
    // Skip if finished
    if (aiCar.finished) continue;

    // Calculate new position
    const deltaTime = 1 / 20; // 50ms update interval = 0.05s

    // Accelerate towards target speed
    if (aiCar.speed < aiCar.targetSpeed) {
      aiCar.speed += aiCar.acceleration * deltaTime;
      if (aiCar.speed > aiCar.targetSpeed) {
        aiCar.speed = aiCar.targetSpeed;
      }
    }

    // Calculate distance traveled
    const distanceDelta = aiCar.speed * deltaTime;
    aiCar.distance += distanceDelta;

    // Calculate new position
    // AI cars stay in their lane (x position) and move forward (z position)
    const lanePosition = aiCar.lane === 0 ? -1.5 : 1.5; // Left or right lane

    // Gradually move to lane position
    if (Math.abs(aiCar.position.x - lanePosition) > 0.1) {
      aiCar.position.x += (lanePosition - aiCar.position.x) * 0.1;
    } else {
      aiCar.position.x = lanePosition;
    }

    // Move forward
    aiCar.position.z -= distanceDelta;

    // Check if finished
    if (aiCar.distance >= RACE_DISTANCE && !aiCar.finished) {
      aiCar.finished = true;
      handleAICarFinish(aiCar.id, gameId);
    }

    // Broadcast position to all players
    io.to(gameId).emit("aiCarPosition", {
      carId: aiCar.id,
      position: aiCar.position,
      speed: aiCar.speed,
      distance: aiCar.distance,
      finished: aiCar.finished,
    });
  }
}

// Handle AI car finish
function handleAICarFinish(aiCarId, gameId) {
  const game = games[gameId];
  if (!game) return;

  // Find AI car
  const aiCar = game.aiCars.find((car) => car.id === aiCarId);
  if (!aiCar) return;

  console.log(`AI car ${aiCar.name} finished race in game ${gameId}`);

  // Add to finish order
  game.finishOrder.push({
    id: aiCarId,
    name: aiCar.name,
    isAI: true,
  });

  // Broadcast finish event
  io.to(gameId).emit("aiCarFinished", {
    carId: aiCarId,
    name: aiCar.name,
    finishOrder: game.finishOrder,
  });
}

// Get game ID for a socket
function getGameIdForSocket(socket) {
  // Check if socket has joined a game
  if (!socket.gameId) {
    console.log(`Socket ${socket.id} has not joined a game`);
    return null;
  }

  // Check if the game exists
  if (!games[socket.gameId]) {
    console.error(`Game ${socket.gameId} not found for player ${socket.id}`);

    // Don't send an error here, as this might be called in contexts where we don't want to send an error
    // socket.emit("error", { message: "Game not found" });

    return null;
  }

  return socket.gameId;
}

// Check if a socket is the host of a game
function isSocketHost(socket, gameId) {
  // Get game data
  const game = games[gameId];

  if (!game) {
    console.log(`Game ${gameId} not found`);
    return false;
  }

  // The first player to join is considered the host
  return game.players.length > 0 && game.players[0].id === socket.id;
}

// Get player name
function getPlayerName(socket) {
  const gameId = getGameIdForSocket(socket);

  if (!gameId || !games[gameId]) {
    return "Unknown";
  }

  // Find player in the game
  const player = games[gameId].players.find((p) => p.id === socket.id);

  return player ? player.name : "Unknown";
}

// Handle player finish
function handlePlayerFinish(playerId, gameId) {
  // Check if game exists
  if (!games[gameId]) {
    console.error(`Game ${gameId} not found when player ${playerId} finished`);
    return;
  }

  console.log(`Player ${playerId} finished in game ${gameId}`);

  // Mark player as finished
  games[gameId].players[playerId].finished = true;

  // Add to finish order
  games[gameId].finishOrder.push({
    id: playerId,
    name: games[gameId].players[playerId].name,
    time: Date.now() - games[gameId].startTime,
  });

  // Check if all players finished
  const allPlayersFinished = Object.values(games[gameId].players).every(
    (player) => player.finished
  );

  if (allPlayersFinished) {
    console.log(`All players finished in game ${gameId}`);

    // End race
    games[gameId].status = "finished";

    // Notify all players
    io.to(gameId).emit("raceFinished", {
      finishOrder: games[gameId].finishOrder,
    });

    // Schedule game cleanup
    const cleanupTimeout = setTimeout(() => {
      cleanupGame(gameId);
    }, 60000); // Clean up after 1 minute

    // Store timeout reference
    if (!gameTimeouts[gameId]) {
      gameTimeouts[gameId] = [];
    }
    gameTimeouts[gameId].push(cleanupTimeout);
  }
}

// Clean up game
function cleanupGame(gameId) {
  if (!games[gameId]) return;

  // Clear AI update interval
  if (games[gameId].aiUpdateInterval) {
    clearInterval(games[gameId].aiUpdateInterval);
  }

  // Remove game
  delete games[gameId];

  console.log(`Game ${gameId} cleaned up`);
}

// Check if race is complete
function checkRaceComplete(gameId) {
  const game = games[gameId];
  if (!game) return;

  // Count total participants
  const totalParticipants =
    Object.keys(game.players).length + (game.aiCars ? game.aiCars.length : 0);

  // If everyone has finished, end the race
  if (game.finishOrder.length >= totalParticipants) {
    game.status = "finished";
    io.to(gameId).emit("raceFinished", {
      finishOrder: game.finishOrder,
    });

    // Clear AI update interval
    if (game.aiUpdateInterval) {
      clearInterval(game.aiUpdateInterval);
    }
  }
}

// Add this debug log function
function logGameState() {
  console.log("Current games:");

  for (const gameId in games) {
    const game = games[gameId];
    console.log(
      `- Game ${gameId}: ${game.players.length} players, status: ${game.status}`
    );

    for (const player of game.players) {
      console.log(`  - Player ${player.id} (${player.name})`);
    }
  }
}

// Call this function periodically
setInterval(logGameState, 60000); // Log every minute

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Handle player joining
  socket.on("joinGame", (data) => {
    const gameId = data.gameId;
    const playerName = data.playerName;

    console.log(
      `Player ${socket.id} (${playerName}) attempting to join game ${gameId}`
    );

    // Validate game ID
    if (!gameId) {
      console.error(`Invalid game ID: ${gameId}`);
      socket.emit("error", { message: "Invalid game ID" });
      return;
    }

    // Create game if it doesn't exist
    if (!games[gameId]) {
      console.log(`Creating new game ${gameId}`);
      games[gameId] = {
        id: gameId,
        players: [],
        started: false,
        status: "waiting",
        finishOrder: [],
        aiCars: [],
      };
    }

    // Store game ID in socket for easy reference
    socket.gameId = gameId;
    console.log(`Stored game ID ${gameId} in socket ${socket.id}`);

    // Check if player is already in the game
    const existingPlayerIndex = games[gameId].players.findIndex(
      (p) => p.id === socket.id
    );
    if (existingPlayerIndex >= 0) {
      console.log(`Player ${socket.id} already in game ${gameId}`);

      // Update player name if it changed
      games[gameId].players[existingPlayerIndex].name = playerName;

      // Re-join game room (in case socket reconnected)
      socket.join(gameId);

      // Send game joined event
      socket.emit("gameJoined", {
        gameId: gameId,
        players: games[gameId].players,
        isHost: existingPlayerIndex === 0,
        startPosition: games[gameId].players[existingPlayerIndex].startPosition,
      });

      return;
    }

    // Calculate starting position based on player count
    // We'll arrange cars in a grid: 2 cars per row, with rows staggered
    const playerCount = games[gameId].players.length;
    const row = Math.floor(playerCount / 2);
    const column = playerCount % 2;

    // Grid spacing
    const columnSpacing = 3; // 3 units between cars in a row
    const rowSpacing = 5; // 5 units between rows

    // Calculate position
    const startPosition = {
      x: column === 0 ? -columnSpacing / 2 : columnSpacing / 2,
      y: 0,
      z: -row * rowSpacing,
    };

    console.log(
      `Assigned starting position for player ${playerCount + 1}: (${
        startPosition.x
      }, ${startPosition.y}, ${startPosition.z})`
    );

    // Add player to game with starting position
    games[gameId].players.push({
      id: socket.id,
      name: playerName,
      finished: false,
      position: { ...startPosition }, // Current position (initially same as start)
      startPosition: startPosition, // Starting position (for race restart)
      speed: 0,
      distance: 0,
    });

    // Join game room
    socket.join(gameId);

    // Determine if this player is the host (first player)
    const isHost = games[gameId].players.length === 1;

    // Notify player they joined the game
    socket.emit("gameJoined", {
      gameId: gameId,
      players: games[gameId].players,
      isHost: isHost,
      startPosition: startPosition,
    });

    // Notify other players in the game
    socket.to(gameId).emit("playerJoined", {
      playerId: socket.id,
      playerName: playerName,
      players: games[gameId].players,
      startPosition: startPosition,
    });

    // Request positions from all existing players
    socket.to(gameId).emit("requestPosition");

    console.log(
      `Game ${gameId} now has ${games[gameId].players.length} players`
    );
  });

  // Handle player position updates
  socket.on("updatePosition", (data) => {
    // Get game ID
    const gameId = socket.gameId; // Use socket.gameId directly instead of getGameIdForSocket

    if (!gameId) {
      console.log(
        `No game ID found for socket ${socket.id} when updating position`
      );
      return;
    }

    // Check if game exists
    if (!games[gameId]) {
      console.error(
        `Game ${gameId} not found for player ${socket.id} when updating position`
      );
      return;
    }

    // Find player in game
    const player = games[gameId].players.find((p) => p.id === socket.id);

    if (!player) {
      console.error(
        `Player ${socket.id} not found in game ${gameId} when updating position`
      );
      return;
    }

    // Update player position
    player.position = data.position;
    player.speed = data.speed;
    player.distance = data.distance;

    // Check if player finished
    if (data.finished && !player.finished) {
      player.finished = true;
      handlePlayerFinish(socket.id, gameId);
    }

    // Broadcast position to other players in the game
    socket.to(gameId).emit("playerPosition", {
      playerId: socket.id,
      playerName: player.name,
      position: data.position,
      speed: data.speed,
      distance: data.distance,
      finished: data.finished,
    });
  });

  // Handle player ready status
  socket.on("playerReady", () => {
    const gameId = players[socket.id];

    // Check if game exists
    if (!gameId || !games[gameId]) {
      console.error(`Game not found for player ${socket.id}`);
      socket.emit("error", { message: "Game not found" });
      return;
    }

    console.log(`Player ${socket.id} is ready in game ${gameId}`);

    // Mark player as ready
    games[gameId].players[socket.id].ready = true;

    // Check if all players are ready
    const allPlayersReady = Object.values(games[gameId].players).every(
      (player) => player.ready
    );

    if (allPlayersReady && games[gameId].status === "waiting") {
      console.log(`All players ready in game ${gameId}, starting countdown`);

      // Start countdown
      games[gameId].status = "countdown";
      io.to(gameId).emit("raceCountdown");

      // Store the game ID and timeout in a map for safety
      const countdownTimeout = setTimeout(() => {
        // Check if game still exists before starting
        if (!games[gameId]) {
          console.error(`Game ${gameId} no longer exists, cannot start race`);
          return;
        }

        console.log(`Starting race in game ${gameId}`);

        // Start race
        games[gameId].status = "racing";
        games[gameId].startTime = Date.now();

        io.to(gameId).emit("raceStart");
      }, 3000);

      // Store the timeout reference to clear it if needed
      if (!gameTimeouts[gameId]) {
        gameTimeouts[gameId] = [];
      }
      gameTimeouts[gameId].push(countdownTimeout);
    }
  });

  // Add a new event handler for requestPosition
  socket.on("requestPosition", () => {
    // Send current position to all players
    const gameId = getGameIdForSocket(socket);

    if (!gameId) {
      return;
    }

    // Send position update
    socket.to(gameId).emit("playerPosition", {
      playerId: socket.id,
      playerName: getPlayerName(socket),
      position: {
        x: 0, // Default position
        y: 0,
        z: 0,
      },
      speed: 0,
      distance: 0,
      finished: false,
    });
  });

  // Handle forceStart event
  socket.on("forceStart", () => {
    console.log("Received forceStart event from socket:", socket.id);

    const gameId = getGameIdForSocket(socket);
    console.log("Game ID for socket:", gameId);

    if (!gameId) {
      console.log("No game ID found for socket, ignoring forceStart");
      return;
    }

    // Check if socket is the host
    const isHost = isSocketHost(socket, gameId);
    console.log("Is socket the host?", isHost);

    if (!isHost) {
      console.log("Socket is not the host, ignoring forceStart");
      // Only the host can force start
      return;
    }

    console.log(`Host is forcing game ${gameId} to start`);

    // Notify all clients in the game
    io.to(gameId).emit("allPlayersReady");
    console.log(`Sent allPlayersReady event to game ${gameId}`);

    // Also send to the socket directly in case it's not properly joined to the room
    socket.emit("allPlayersReady");
    console.log(
      `Also sent allPlayersReady event directly to host socket ${socket.id}`
    );
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Get game ID
    const gameId = socket.gameId;

    if (!gameId) {
      console.log(`No game ID found for disconnected socket ${socket.id}`);
      return;
    }

    // Get game
    const game = games[gameId];

    if (!game) {
      console.log(
        `Game ${gameId} not found for disconnected socket ${socket.id}`
      );
      return;
    }

    // Find player in game
    const playerIndex = game.players.findIndex((p) => p.id === socket.id);

    if (playerIndex >= 0) {
      const playerName = game.players[playerIndex].name;
      game.players.splice(playerIndex, 1);

      console.log(
        `Removed player ${socket.id} (${playerName}) from game ${gameId}`
      );

      // Notify other players
      socket.to(gameId).emit("playerLeft", {
        playerId: socket.id,
        playerName: playerName,
        players: game.players,
      });

      // If no players left, clean up game
      if (game.players.length === 0) {
        console.log(`No players left in game ${gameId}, cleaning up`);
        cleanupGame(gameId);
      }
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error(`Socket error for ${socket.id}:`, error);

    // Notify client
    socket.emit("error", {
      message: error.message || "Unknown error",
    });
  });

  // Handle custom error events
  socket.on("reportError", (error) => {
    console.error(`Client error reported by ${socket.id}:`, error);
  });

  // Update the startGame event handler to add AI cars
  socket.on("startGame", () => {
    // Get game ID
    const gameId = getGameIdForSocket(socket);

    if (!gameId) {
      console.error(
        `No game ID found for socket ${socket.id} when starting game`
      );
      socket.emit("error", { message: "Game not found" });
      return;
    }

    console.log(`Starting game ${gameId}`);

    // Check if game exists
    if (!games[gameId]) {
      console.error(`Game ${gameId} not found when starting game`);
      socket.emit("error", { message: "Game not found" });
      return;
    }

    // Check if player is host
    const playerIndex = games[gameId].players.findIndex(
      (p) => p.id === socket.id
    );
    if (playerIndex !== 0) {
      console.error(`Player ${socket.id} is not host of game ${gameId}`);
      socket.emit("error", { message: "Only host can start game" });
      return;
    }

    // Check if game already started
    if (games[gameId].started) {
      console.log(`Game ${gameId} already started`);
      return;
    }

    // Add AI cars if there are fewer than 4 players
    const playerCount = games[gameId].players.length;
    if (playerCount < 4) {
      const aiCount = 4 - playerCount;
      console.log(`Adding ${aiCount} AI cars to game ${gameId}`);
      addAICars(gameId, aiCount);
    }

    // Mark game as started
    games[gameId].started = true;
    games[gameId].status = "countdown";

    // Start countdown
    io.to(gameId).emit("gameCountdown", { count: 3 });

    // Countdown from 3 to 1
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;

      if (count > 0) {
        io.to(gameId).emit("gameCountdown", { count });
      } else {
        clearInterval(countdownInterval);

        // Start race
        games[gameId].status = "racing";
        games[gameId].startTime = Date.now();

        io.to(gameId).emit("gameStarted");

        console.log(`Game ${gameId} started`);

        // Start AI car updates
        const aiUpdateInterval = setInterval(() => {
          // Check if game still exists
          if (!games[gameId]) {
            clearInterval(aiUpdateInterval);
            return;
          }

          // Update AI cars
          updateAICars(gameId);
        }, 50); // Update AI cars every 50ms

        // Store interval ID for cleanup
        games[gameId].aiUpdateInterval = aiUpdateInterval;
      }
    }, 1000);
  });

  // Add this event handler to allow the host to add AI cars
  socket.on("addAICars", (data) => {
    // Get game ID
    const gameId = getGameIdForSocket(socket);

    if (!gameId) {
      console.error(
        `No game ID found for socket ${socket.id} when adding AI cars`
      );
      socket.emit("error", { message: "Game not found" });
      return;
    }

    // Check if game exists
    if (!games[gameId]) {
      console.error(`Game ${gameId} not found when adding AI cars`);
      socket.emit("error", { message: "Game not found" });
      return;
    }

    // Check if player is host
    const playerIndex = games[gameId].players.findIndex(
      (p) => p.id === socket.id
    );
    if (playerIndex !== 0) {
      console.error(`Player ${socket.id} is not host of game ${gameId}`);
      socket.emit("error", { message: "Only host can add AI cars" });
      return;
    }

    // Check if game already started
    if (games[gameId].started) {
      console.error(
        `Cannot add AI cars to game ${gameId} after it has started`
      );
      socket.emit("error", {
        message: "Cannot add AI cars after game has started",
      });
      return;
    }

    // Add AI cars
    const count = data.count || 1;
    console.log(
      `Host ${socket.id} requested to add ${count} AI cars to game ${gameId}`
    );
    addAICars(gameId, count);

    // Notify host
    socket.emit("aiCarsAdded", { count });
  });
});

// Add a simple endpoint to verify the server is running
app.get("/status", (req, res) => {
  res.json({
    status: "ok",
    message: "Racing game server is running",
    activeGames: Object.keys(games).length,
    activePlayers: Object.keys(players).length,
  });
});

// Debug endpoint to list all games
app.get("/debug/games", (req, res) => {
  const gamesList = Object.keys(games).map((gameId) => {
    const game = games[gameId];
    return {
      id: gameId,
      playerCount: game.players.length,
      players: game.players.map((p) => ({ id: p.id, name: p.name })),
      status: game.status,
    };
  });

  res.json({
    totalGames: Object.keys(games).length,
    games: gamesList,
  });
});

// Debug endpoint to get a specific game
app.get("/debug/games/:gameId", (req, res) => {
  const gameId = req.params.gameId;
  const game = games[gameId];

  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }

  res.json({
    id: gameId,
    players: game.players,
    status: game.status,
    aiCars: game.aiCars ? game.aiCars.length : 0,
    finishOrder: game.finishOrder,
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Racing game server running on port ${PORT}`);
});
