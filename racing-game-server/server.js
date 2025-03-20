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
  },
});

// Store active games and players
const games = {};
const players = {};

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
      lap: 0,
      ready: false,
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
  });

  // Handle player position updates
  socket.on("updatePosition", (data) => {
    const gameId = players[socket.id];
    if (!gameId || !games[gameId]) return;

    // Update player position, rotation, and other state
    const player = games[gameId].players[socket.id];
    if (player) {
      player.position = data.position;
      player.rotation = data.rotation;
      player.speed = data.speed;

      // Broadcast position to all other players in the game
      socket.to(gameId).emit("playerMoved", {
        id: socket.id,
        position: data.position,
        rotation: data.rotation,
        speed: data.speed,
      });
    }
  });

  // Handle player ready state
  socket.on("playerReady", () => {
    const gameId = players[socket.id];
    if (!gameId || !games[gameId]) return;

    games[gameId].players[socket.id].ready = true;

    // Check if all players are ready
    const allReady = Object.values(games[gameId].players).every(
      (player) => player.ready
    );

    if (allReady && Object.keys(games[gameId].players).length >= 1) {
      // Start countdown
      games[gameId].status = "countdown";
      io.to(gameId).emit("raceCountdown");

      // Start race after countdown
      setTimeout(() => {
        games[gameId].status = "racing";
        games[gameId].startTime = Date.now();
        io.to(gameId).emit("raceStart");
      }, 3000); // 3 second countdown
    }
  });

  // Handle lap completion
  socket.on("lapCompleted", (lapData) => {
    const gameId = players[socket.id];
    if (!gameId || !games[gameId]) return;

    const player = games[gameId].players[socket.id];
    if (player) {
      player.lap = lapData.lap;

      // Check for race finish (e.g., 3 laps)
      if (lapData.lap >= 3) {
        games[gameId].finishOrder.push({
          id: socket.id,
          name: player.name,
          time: Date.now() - games[gameId].startTime,
        });

        io.to(gameId).emit("playerFinished", {
          id: socket.id,
          name: player.name,
          position: games[gameId].finishOrder.length,
          time: Date.now() - games[gameId].startTime,
        });

        // If all players finished, end the race
        if (
          games[gameId].finishOrder.length ===
          Object.keys(games[gameId].players).length
        ) {
          games[gameId].status = "finished";
          io.to(gameId).emit("raceFinished", {
            finishOrder: games[gameId].finishOrder,
          });
        }
      }

      // Broadcast lap update to all players
      io.to(gameId).emit("playerLap", {
        id: socket.id,
        lap: lapData.lap,
      });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);

    const gameId = players[socket.id];
    if (gameId && games[gameId]) {
      // Remove player from game
      delete games[gameId].players[socket.id];

      // Notify other players
      io.to(gameId).emit("playerLeft", {
        id: socket.id,
      });

      // Clean up empty games
      if (Object.keys(games[gameId].players).length === 0) {
        delete games[gameId];
      }
    }

    // Remove player from players list
    delete players[socket.id];
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Racing game server running on port ${PORT}`);
});
