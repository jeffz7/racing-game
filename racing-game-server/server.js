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

// Add this near the top with other declarations
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) {
    console.log(`[DEBUG ${new Date().toISOString()}]`, ...args);
  }
}

// Add AI cars to a game
function addAICarsToGame(gameId) {
  const game = games[gameId];
  if (!game) {
    debugLog(`Cannot add AI cars: game ${gameId} not found`);
    return;
  }

  const humanPlayerCount = Object.keys(game.players).length;
  const aiCarsToAdd = Math.max(0, MAX_CARS - humanPlayerCount);

  debugLog(`Adding ${aiCarsToAdd} AI cars to game ${gameId}`);
  console.log(`Adding ${aiCarsToAdd} AI cars to game ${gameId}`);

  // Create AI cars with grid positions
  game.aiCars = [];

  // Get positions that are already taken by human players
  const takenPositionIndices = [...(game.takenPositions || [])];

  debugLog(
    `Taken positions before adding AI cars: ${JSON.stringify(
      takenPositionIndices
    )}`
  );

  // Create AI cars for remaining positions
  for (let i = 0; i < aiCarsToAdd; i++) {
    // Find next available position
    let positionIndex = -1;

    for (let j = 0; j < game.gridPositions.length; j++) {
      if (!takenPositionIndices.includes(j)) {
        positionIndex = j;
        takenPositionIndices.push(j);
        break;
      }
    }

    // If all standard positions are taken, create overflow positions
    if (positionIndex === -1) {
      const offset = takenPositionIndices.length - game.gridPositions.length;
      positionIndex = game.gridPositions.length + offset;
      takenPositionIndices.push(positionIndex);
    }

    // Get the position coordinates
    let position;
    if (positionIndex < game.gridPositions.length) {
      position = { ...game.gridPositions[positionIndex] };
    } else {
      // Create overflow positions in additional rows
      const offset = positionIndex - game.gridPositions.length;
      position = {
        x: (offset % 3) * 4 - 4,
        y: 0,
        z: 8 + Math.floor(offset / 3) * 4,
      };
    }

    debugLog(
      `Adding AI car at grid position ${positionIndex}: ${JSON.stringify(
        position
      )}`
    );

    game.aiCars.push({
      id: `ai-${i}-${gameId}`,
      name: `AI ${i + 1}`,
      position: position,
      rotation: { x: 0, y: 0, z: 0 },
      speed: 0,
      distance: 0,
      finished: false,
      gridPosition: positionIndex,
    });
  }

  // Update the game's taken positions
  game.takenPositions = takenPositionIndices;
  debugLog(
    `Taken positions after adding AI cars: ${JSON.stringify(
      game.takenPositions
    )}`
  );

  // Start AI update loop if there are AI cars
  if (game.aiCars.length > 0) {
    game.aiUpdateInterval = setInterval(
      () => updateAICars(gameId),
      AI_UPDATE_INTERVAL
    );
  }

  // Notify players about AI cars
  debugLog(
    `Notifying players about ${game.aiCars.length} AI cars in game ${gameId}`
  );
  io.to(gameId).emit("aiCarsAdded", { aiCars: game.aiCars });
}

// Update AI car positions
function updateAICars(gameId) {
  const game = games[gameId];
  if (!game || !game.aiCars || game.status !== "racing") return;

  // Occasional debug log to avoid flooding
  if (Math.random() < 0.01) {
    debugLog(`Updating ${game.aiCars.length} AI cars in game ${gameId}`);
  }

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

    debugLog(
      `AI car ${aiCar.id} (${aiCar.name}) finished race in game ${gameId}`
    );

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

  debugLog(
    `Game ${gameId}: ${game.finishOrder.length}/${totalParticipants} participants finished`
  );

  // If everyone has finished, end the race
  if (game.finishOrder.length >= totalParticipants) {
    debugLog(`Race complete in game ${gameId}, all participants finished`);
    game.status = "finished";
    io.to(gameId).emit("raceFinished", {
      finishOrder: game.finishOrder,
    });

    // Clear AI update interval
    if (game.aiUpdateInterval) {
      clearInterval(game.aiUpdateInterval);
      debugLog(`Cleared AI update interval for game ${gameId}`);
    }
  }
}

// Socket.IO connection handler
io.on("connection", (socket) => {
  debugLog(`Player connected: ${socket.id}`);
  console.log(`Player connected: ${socket.id}`);

  // Handle player joining
  socket.on("joinGame", (data) => {
    const { gameId, playerName } = data;
    debugLog(`Player ${socket.id} (${playerName}) joining game ${gameId}`);

    // Create game if it doesn't exist
    if (!games[gameId]) {
      debugLog(`Creating new game with ID: ${gameId}`);
      games[gameId] = {
        id: gameId,
        players: {},
        status: "waiting", // waiting, countdown, racing, finished
        startTime: null,
        finishOrder: [],
        aiCars: [],
        takenPositions: [], // Track which positions are already taken
        gridPositions: [
          // Front row (3 cars)
          { x: -4, y: 0, z: 0 }, // Left
          { x: 0, y: 0, z: 0 }, // Center
          { x: 4, y: 0, z: 0 }, // Right

          // Back row (2 cars)
          { x: -2, y: 0, z: 4 }, // Left-back
          { x: 2, y: 0, z: 4 }, // Right-back
        ],
      };
    }

    let replacedAI = null;
    let playerPosition = { x: 0, y: 0, z: 0 };
    let gridPositionIndex = -1;

    // If this is not the first player and there are AI cars, replace one
    if (
      Object.keys(games[gameId].players).length > 0 &&
      games[gameId].aiCars &&
      games[gameId].aiCars.length > 0
    ) {
      // Remove one AI car (preferably from a good grid position)
      // Sort AI cars by grid position to replace front positions first
      games[gameId].aiCars.sort(
        (a, b) => (a.gridPosition || 99) - (b.gridPosition || 99)
      );
      replacedAI = games[gameId].aiCars.shift(); // Take the first (best position) AI car

      debugLog(
        `Player ${socket.id} replacing AI car ${replacedAI.id} at grid position ${replacedAI.gridPosition}`
      );

      // Use the AI car's position for the new player
      playerPosition = { ...replacedAI.position };
      gridPositionIndex = replacedAI.gridPosition;

      // Notify clients about AI car removal
      io.to(gameId).emit("aiCarRemoved", { aiCarId: replacedAI.id });
    } else if (Object.keys(games[gameId].players).length === 0) {
      // First player gets the center front position
      playerPosition = { ...games[gameId].gridPositions[1] };
      gridPositionIndex = 1;
      games[gameId].takenPositions.push(1); // Mark this position as taken
      debugLog(`First player taking grid position 1 (center front)`);
    } else {
      // Fallback: find an available position
      for (let i = 0; i < games[gameId].gridPositions.length; i++) {
        if (!games[gameId].takenPositions.includes(i)) {
          playerPosition = { ...games[gameId].gridPositions[i] };
          gridPositionIndex = i;
          games[gameId].takenPositions.push(i);
          debugLog(`Player taking available grid position ${i}`);
          break;
        }
      }

      // If all positions are taken, create a new position
      if (gridPositionIndex === -1) {
        const offset =
          games[gameId].takenPositions.length -
          games[gameId].gridPositions.length;
        playerPosition = {
          x: (offset % 3) * 4 - 4,
          y: 0,
          z: 8 + Math.floor(offset / 3) * 4,
        };
        gridPositionIndex = games[gameId].gridPositions.length + offset;
        games[gameId].takenPositions.push(gridPositionIndex);
        debugLog(`Player taking overflow grid position ${gridPositionIndex}`);
      }
    }

    // Add player to game with the determined position
    games[gameId].players[socket.id] = {
      id: socket.id,
      name: playerName,
      position: playerPosition,
      rotation: { x: 0, y: 0, z: 0 },
      speed: 0,
      distance: 0,
      ready: false,
      finished: false,
      hasGridPosition: true,
      gridPosition: gridPositionIndex,
    };

    // Track which game this player is in
    players[socket.id] = gameId;

    // Join the Socket.IO room for this game
    socket.join(gameId);

    // Notify everyone in the game about the new player
    debugLog(
      `Notifying players about new player ${playerName} in game ${gameId} at position ${JSON.stringify(
        playerPosition
      )}`
    );
    io.to(gameId).emit("playerJoined", {
      playerId: socket.id,
      playerName: playerName,
      players: games[gameId].players,
      replacedAI: replacedAI ? replacedAI.id : null,
    });

    // Send existing AI cars to the newly joined player
    if (games[gameId].aiCars && games[gameId].aiCars.length > 0) {
      debugLog(
        `Sending ${games[gameId].aiCars.length} existing AI cars to new player ${socket.id}`
      );
      socket.emit("aiCarsAdded", { aiCars: games[gameId].aiCars });
    }

    // Check if we need to add AI cars (only for the first player)
    if (Object.keys(games[gameId].players).length === 1) {
      // First player joined, add AI cars
      debugLog(`First player joined game ${gameId}, adding AI cars`);
      addAICarsToGame(gameId);
    }
  });

  // Handle player position updates
  socket.on("updatePosition", (data) => {
    const gameId = players[socket.id];

    // Check if game exists
    if (!gameId || !games[gameId]) {
      debugLog(
        `Received position update from ${socket.id} but game no longer exists`
      );
      return;
    }

    // Update player position
    if (games[gameId].players[socket.id]) {
      games[gameId].players[socket.id].position = data.position;
      games[gameId].players[socket.id].rotation = data.rotation;
      games[gameId].players[socket.id].speed = data.speed;
      games[gameId].players[socket.id].distance = data.distance;

      // Only log occasional position updates to avoid flooding logs
      if (Math.random() < 0.01) {
        debugLog(
          `Player ${socket.id} position update: speed=${data.speed.toFixed(
            2
          )}, distance=${data.distance.toFixed(2)}`
        );
      }

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
        debugLog(
          `Player ${socket.id} reported finish, handling race completion`
        );
        handlePlayerFinish(socket.id, gameId);
      }
    }
  });

  // Handle player ready status
  socket.on("playerReady", () => {
    const gameId = players[socket.id];

    // Check if game exists
    if (!gameId || !games[gameId]) {
      debugLog(`Player ${socket.id} ready but game not found`);
      console.error(`Game not found for player ${socket.id}`);
      socket.emit("error", { message: "Game not found" });
      return;
    }

    debugLog(`Player ${socket.id} is ready in game ${gameId}`);
    console.log(`Player ${socket.id} is ready in game ${gameId}`);

    // Mark player as ready
    games[gameId].players[socket.id].ready = true;

    // Check if all players are ready
    const allPlayersReady = Object.values(games[gameId].players).every(
      (player) => player.ready
    );

    debugLog(
      `Game ${gameId}: ${
        Object.keys(games[gameId].players).length
      } players, all ready: ${allPlayersReady}`
    );

    if (allPlayersReady && games[gameId].status === "waiting") {
      debugLog(`All players ready in game ${gameId}, starting countdown`);
      console.log(`All players ready in game ${gameId}, starting countdown`);

      // Start countdown
      games[gameId].status = "countdown";
      io.to(gameId).emit("raceCountdown");

      // Store the game ID and timeout in a map for safety
      const countdownTimeout = setTimeout(() => {
        // Check if game still exists before starting
        if (!games[gameId]) {
          debugLog(`Game ${gameId} no longer exists, cannot start race`);
          console.error(`Game ${gameId} no longer exists, cannot start race`);
          return;
        }

        debugLog(`Starting race in game ${gameId}`);
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
    debugLog(`Player disconnected: ${socket.id}`);
    console.log(`Player disconnected: ${socket.id}`);

    const gameId = players[socket.id];

    // Check if player was in a game
    if (gameId && games[gameId]) {
      debugLog(`Removing player ${socket.id} from game ${gameId}`);
      // Remove player from game
      delete games[gameId].players[socket.id];

      // Notify other players
      socket.to(gameId).emit("playerLeft", { id: socket.id });

      // Check if game is empty
      if (Object.keys(games[gameId].players).length === 0) {
        debugLog(`Game ${gameId} is empty, cleaning up`);
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
    debugLog(`Game ${gameId} not found when player ${playerId} finished`);
    console.error(`Game ${gameId} not found when player ${playerId} finished`);
    return;
  }

  debugLog(`Player ${playerId} finished in game ${gameId}`);
  console.log(`Player ${playerId} finished in game ${gameId}`);

  // Mark player as finished
  games[gameId].players[playerId].finished = true;

  // Add to finish order
  const finishTime = Date.now() - games[gameId].startTime;
  debugLog(`Player ${playerId} finish time: ${finishTime}ms`);

  games[gameId].finishOrder.push({
    id: playerId,
    name: games[gameId].players[playerId].name,
    time: finishTime,
  });

  // Check if all players finished
  const allPlayersFinished = Object.values(games[gameId].players).every(
    (player) => player.finished
  );

  if (allPlayersFinished) {
    debugLog(`All players finished in game ${gameId}`);
    console.log(`All players finished in game ${gameId}`);

    // End race
    games[gameId].status = "finished";

    // Notify all players
    io.to(gameId).emit("raceFinished", {
      finishOrder: games[gameId].finishOrder,
    });

    // Schedule game cleanup
    debugLog(`Scheduling cleanup for game ${gameId} in 60 seconds`);
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
  debugLog(`Cleaning up game ${gameId}`);
  console.log(`Cleaning up game ${gameId}`);

  // Clear any pending timeouts
  if (gameTimeouts[gameId]) {
    debugLog(
      `Clearing ${gameTimeouts[gameId].length} timeouts for game ${gameId}`
    );
    gameTimeouts[gameId].forEach((timeout) => clearTimeout(timeout));
    delete gameTimeouts[gameId];
  }

  // Remove game
  delete games[gameId];

  debugLog(
    `Game ${gameId} removed, active games: ${Object.keys(games).length}`
  );
  console.log(
    `Game ${gameId} removed, active games: ${Object.keys(games).length}`
  );
}
