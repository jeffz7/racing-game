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

// AI car configuration
const MAX_CARS = 5;
const AI_UPDATE_INTERVAL = 100; // ms
const RACE_DISTANCE = 1000; // Distance to finish line

// Add AI cars to a game
function addAICarsToGame(gameId) {
  const game = games[gameId];
  if (!game) return;

  const humanPlayerCount = Object.keys(game.players).length;
  const aiCarsToAdd = Math.max(0, MAX_CARS - humanPlayerCount);

  console.log(`Adding ${aiCarsToAdd} AI cars to game ${gameId}`);

  // Create AI cars
  game.aiCars = [];
  for (let i = 0; i < aiCarsToAdd; i++) {
    game.aiCars.push({
      id: `ai-${i}-${gameId}`,
      name: `AI ${i + 1}`,
      position: { x: i * 5 - 10, y: 0, z: 0 }, // Starting positions
      rotation: { x: 0, y: 0, z: 0 },
      speed: 0,
      distance: 0, // Distance traveled
      finished: false,
    });
  }

  // Start AI update loop if there are AI cars
  if (game.aiCars.length > 0) {
    game.aiUpdateInterval = setInterval(
      () => updateAICars(gameId),
      AI_UPDATE_INTERVAL
    );
  }

  // Notify players about AI cars
  io.to(gameId).emit("aiCarsAdded", { aiCars: game.aiCars });
}

// Update AI car positions
function updateAICars(gameId) {
  const game = games[gameId];
  if (!game || !game.aiCars || game.status !== "racing") return;

  // Update each AI car
  game.aiCars.forEach((aiCar) => {
    if (aiCar.finished) return;

    // Simple AI movement logic
    moveAICar(aiCar);

    // Check for finish line crossing
    checkAIFinishLine(gameId, aiCar);

    // Broadcast AI car position to all players
    io.to(gameId).emit("aiCarMoved", {
      id: aiCar.id,
      position: aiCar.position,
      rotation: aiCar.rotation,
      speed: aiCar.speed,
    });
  });
}

// Simple AI movement function
function moveAICar(aiCar) {
  // Simple forward movement
  aiCar.position.z += aiCar.speed * 0.1;

  // Update distance traveled
  aiCar.distance += aiCar.speed * 0.1;

  // Gradually increase speed with some randomness
  if (aiCar.speed < 60) {
    aiCar.speed += 0.2 + Math.random() * 0.3;
  }

  // Add some lane changes occasionally
  if (Math.random() < 0.01) {
    aiCar.position.x += (Math.random() - 0.5) * 2;
  }
}

// Check if AI car crossed the finish line
function checkAIFinishLine(gameId, aiCar) {
  if (aiCar.distance >= RACE_DISTANCE && !aiCar.finished) {
    aiCar.finished = true;
    const game = games[gameId];

    game.finishOrder.push({
      id: aiCar.id,
      name: aiCar.name,
      time: Date.now() - game.startTime,
      isAI: true,
    });

    io.to(gameId).emit("aiCarFinished", {
      id: aiCar.id,
      name: aiCar.name,
      position: game.finishOrder.length,
      time: Date.now() - game.startTime,
    });

    // Check if race is complete (all players and AI cars finished)
    checkRaceComplete(gameId);
  }
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

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Handle player joining
  socket.on("joinGame", (data) => {
    const { gameId, playerName } = data;

    // Create game if it doesn't exist
    if (!games[gameId]) {
      games[gameId] = {
        id: gameId,
        players: {},
        status: "waiting", // waiting, countdown, racing, finished
        startTime: null,
        finishOrder: [],
      };
    }

    // Add player to game
    games[gameId].players[socket.id] = {
      id: socket.id,
      name: playerName,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      speed: 0,
      distance: 0,
      ready: false,
      finished: false,
    };

    // Track which game this player is in
    players[socket.id] = gameId;

    // Join the Socket.IO room for this game
    socket.join(gameId);

    // Notify everyone in the game about the new player
    io.to(gameId).emit("playerJoined", {
      playerId: socket.id,
      playerName: playerName,
      players: games[gameId].players,
    });

    // Check if we need to add AI cars
    if (Object.keys(games[gameId].players).length === 1) {
      // First player joined, add AI cars
      addAICarsToGame(gameId);
    }
  });

  // Handle player position updates
  socket.on("updatePosition", (data) => {
    const gameId = players[socket.id];

    // Check if game exists
    if (!gameId || !games[gameId]) {
      // Game no longer exists, don't process updates
      return;
    }

    // Update player position
    if (games[gameId].players[socket.id]) {
      games[gameId].players[socket.id].position = data.position;
      games[gameId].players[socket.id].rotation = data.rotation;
      games[gameId].players[socket.id].speed = data.speed;
      games[gameId].players[socket.id].distance = data.distance;

      // Broadcast to other players
      socket.to(gameId).emit("playerPosition", {
        id: socket.id,
        position: data.position,
        rotation: data.rotation,
        speed: data.speed,
        distance: data.distance,
      });

      // Check if player finished
      if (
        data.finished &&
        !games[gameId].players[socket.id].finished &&
        games[gameId].status === "racing"
      ) {
        handlePlayerFinish(socket.id, gameId);
      }
    }
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

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);

    const gameId = players[socket.id];

    // Check if player was in a game
    if (gameId && games[gameId]) {
      // Remove player from game
      delete games[gameId].players[socket.id];

      // Notify other players
      socket.to(gameId).emit("playerLeft", { id: socket.id });

      // Check if game is empty
      if (Object.keys(games[gameId].players).length === 0) {
        console.log(`Game ${gameId} is empty, cleaning up`);
        cleanupGame(gameId);
      }
    }

    // Remove player from players list
    delete players[socket.id];
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

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Racing game server running on port ${PORT}`);
});

// Add this at the top of your file with other declarations
const gameTimeouts = {};

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
  console.log(`Cleaning up game ${gameId}`);

  // Clear any pending timeouts
  if (gameTimeouts[gameId]) {
    gameTimeouts[gameId].forEach((timeout) => clearTimeout(timeout));
    delete gameTimeouts[gameId];
  }

  // Remove game
  delete games[gameId];

  console.log(
    `Game ${gameId} removed, active games: ${Object.keys(games).length}`
  );
}
