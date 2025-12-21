// Basic Node.js server for a server-authoritative fighting game
import http from 'http';
import { WebSocketServer } from 'ws';

const server = http.createServer();
const wss = new WebSocketServer({ server });


class Player {
  constructor(id, ws) {
    this.id = id;
    this.ws = ws;
    this.x = id === 0 ? 100 : 500;
    this.y = 550;
    this.vx = 0;
    this.vy = 0;
    this.input = {};
    this.isJumping = false;
    this.isJumpingDiagonal = false;
    this.health = 500; // Max health
    this.justLanded = false; // Track if just landed from jump
    this.isPunching = false; // Track punch animation state
    this.isKicking = false; // Track kick animation state
    this.punchTimer = 0; // Duration of punch animation
    this.kickTimer = 0; // Duration of kick animation
  }
  setInput(input) {
    this.input = input;
    // Track punch/kick for hit detection
    this.justPunched = !!input.punch;
    this.justKicked = !!input.kick;
    // Set animation state and timers
    if (input.punch) {
      this.isPunching = true;
      this.punchTimer = 250; // milliseconds
    }
    if (input.kick) {
      this.isKicking = true;
      this.kickTimer = 250; // milliseconds
    }
  }
  update(dt, otherPlayer) {
    const speed = 7;
    const jumpSpeed = 22;
    const gravity = 2;
    const floorY = 450;
    
    // Update punch/kick timers
    if (this.punchTimer > 0) {
      this.punchTimer -= dt;
      if (this.punchTimer <= 0) {
        this.isPunching = false;
        this.punchTimer = 0;
      }
    }
    if (this.kickTimer > 0) {
      this.kickTimer -= dt;
      if (this.kickTimer <= 0) {
        this.isKicking = false;
        this.kickTimer = 0;
      }
    }

    // Horizontal movement with collision (only if both players are on ground)
    let nextX = this.x;
    if (this.input.left) nextX -= speed * dt / 16;
    if (this.input.right) nextX += speed * dt / 16;
    // Prevent overlap with other player (only if both are grounded)
    if (otherPlayer && !this.isJumping && !otherPlayer.isJumping) {
      const minDist = 30; // allow closer bodies
      if (otherPlayer.x > this.x && nextX + minDist > otherPlayer.x) {
        nextX = otherPlayer.x - minDist;
      } else if (otherPlayer.x < this.x && nextX - minDist < otherPlayer.x) {
        nextX = otherPlayer.x + minDist;
      }
    }
    this.x = nextX;
    this.justLanded = false; // Reset justLanded flag each frame

    // Jump initiation
    if (this.input.up && !this.isJumping && this.y === floorY) {
      this.isJumping = true;
      this.vy = -jumpSpeed;
      // Diagonal jump
      if (this.input.left) {
        this.vx = -speed;
        this.isJumpingDiagonal = true;
      } else if (this.input.right) {
        this.vx = speed;
        this.isJumpingDiagonal = true;
      } else {
        this.vx = 0;
        this.isJumpingDiagonal = false;
      }
    }

    // Apply jump physics (no collision during jump - allow jumping over)
    if (this.isJumping) {
      this.y += this.vy * dt / 16;
      this.x += this.vx * dt / 16;
      this.vy += gravity * dt / 16;
      // Land on floor
      if (this.y >= floorY) {
        this.y = floorY;
        this.vy = 0;
        this.vx = 0;
        this.isJumping = false;
        this.isJumpingDiagonal = false;
        this.justLanded = true; // Set flag to prevent push on landing
      }
    } else {
      this.y = floorY;
    }

    // Prevent going out of bounds horizontally
    if (this.x < 0) this.x = 0;
    if (this.x > 750) this.x = 750;
  }
  getState() {
    return { x: this.x, y: this.y, isJumpingDiagonal: this.isJumpingDiagonal, health: this.health, down: !!this.input.down, isPunching: this.isPunching, isKicking: this.isKicking };
  }
}

class Game {
  constructor() {
    this.players = {};
  }
  addPlayer(id, ws) {
    this.players[id] = new Player(id, ws);
  }
  removePlayer(id) {
    delete this.players[id];
  }
  handleInput(id, input) {
    if (this.players[id]) {
      this.players[id].setInput(input);
    }
  }
  update(dt) {
    // Update all players with collision
    const ids = Object.keys(this.players);
    if (ids.length === 2) {
      const p0 = this.players[ids[0]];
      const p1 = this.players[ids[1]];
      p0.update(dt, p1);
      p1.update(dt, p0);
      // Hit detection (same as before)
      const dist = Math.abs(p0.x - p1.x);
      if (dist < 40 && Math.abs(p0.y - p1.y) < 40) {
        // Player 0 attacks (p1 blocks if crouched)
        if (!p1.input.down) {
          if (p0.justPunched) {
            p1.health -= 10;
          }
          if (p0.justKicked) {
            p1.health -= 15;
          }
        }
        // Player 1 attacks (p0 blocks if crouched)
        if (!p0.input.down) {
          if (p1.justPunched) {
            p0.health -= 10;
          }
          if (p1.justKicked) {
            p0.health -= 15;
          }
        }
        // Clamp health
        p0.health = Math.max(0, p0.health);
        p1.health = Math.max(0, p1.health);
      }
      // Reset punch/kick
      p0.justPunched = false;
      p0.justKicked = false;
      p1.justPunched = false;
      p1.justKicked = false;
    } else {
      // Only one player, no collision
      Object.values(this.players).forEach(p => p.update(dt));
    }
  }
  getState() {
    return {
      boxes: Object.values(this.players).map(p => p.getState())
    };
  }
}

const game = new Game();


function broadcast(state) {
  Object.values(game.players).forEach(player => {
    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({ type: 'state', state }));
    }
  });
}


wss.on('connection', (ws) => {
  const playerId = Object.keys(game.players).length;
  if (playerId > 1) {
    ws.send(JSON.stringify({ type: 'full' }));
    ws.close();
    return;
  }
  game.addPlayer(playerId, ws);
  ws.send(JSON.stringify({ type: 'init', playerId }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'input') {
        game.handleInput(playerId, data);
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    game.removePlayer(playerId);
  });
});



let lastUpdate = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = now - lastUpdate;
  lastUpdate = now;
  game.update(dt);
  broadcast(game.getState());
}, 16);

server.listen(3000, () => {
  console.log('Game server running on port 3000');
});
