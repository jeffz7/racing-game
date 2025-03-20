# Racing Game

A 3D multiplayer racing game with realistic physics, built using Three.js and Node.js.

![Racing Game Screenshot](assets/images/screenshot.png)

## Project Structure

This project consists of two main components:

- **racing-game-client**: The frontend game client built with Three.js
- **racing-game-server**: The multiplayer server built with Node.js and Socket.IO

## Features

### Client

- 3D racing environment with realistic physics
- Player car with detailed physics (acceleration, gears, RPM, wheelspin)
- AI opponents with intelligent behavior
- Race track with start/finish lines and boundaries
- Visual effects (exhaust particles, headlights)
- Audio system with engine sounds, collisions, and more
- HUD showing speed, RPM, gear, and race information
- Leaderboard and race position tracking
- Support for keyboard and touch controls

### Server

- Real-time multiplayer racing with WebSocket communication
- Game room system for multiple concurrent races
- Player position and state synchronization
- Race management (countdown, start, finish)
- Lap tracking and race completion
- Leaderboard and finish order

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm
- Modern web browser with WebGL support

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/racing-game.git
   cd racing-game
   ```

2. Install and start the client:

   ```bash
   cd racing-game-client
   npm install
   npm start
   ```

3. Install and start the server:
   ```bash
   cd ../racing-game-server
   npm install
   npm run dev
   ```

## Playing the Game

### Single Player

1. Open your browser and navigate to `http://localhost:8080` (or whatever port your client is running on)
2. Use arrow keys or WASD to control your car
3. Complete 3 laps to finish the race

### Multiplayer

1. Start the server as described above
2. Open multiple browser windows or connect from different devices
3. Join the same game room
4. Race against your friends in real-time!

## Controls

- **W / Up Arrow**: Accelerate
- **S / Down Arrow**: Brake/Reverse
- **A / Left Arrow**: Steer left
- **D / Right Arrow**: Steer right
- **Shift**: Shift up gear
- **Ctrl**: Shift down gear
- **R**: Reset car position
- **Space**: Handbrake

## Development

### Client

The client code is organized into modules for different game systems:

- Physics
- Audio
- AI
- Player controls
- Track
- UI
- Multiplayer integration

### Server

The server handles:

- Player connections
- Game state synchronization
- Race management
- Leaderboard tracking

## License

MIT

## Acknowledgments

- Three.js for 3D rendering
- Socket.IO for real-time communication
- [List any other libraries or resources you've used]
