// Basic Node.js server for a server-authoritative fighting game

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
// Serve static files from root, public, and src
app.use(express.static('dist'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });


class Player {
  constructor(id, ws) {
    this.id = id;
    this.ws = ws;
    this.x = id === 0 ? 100 : 500;
    this.y = 385;
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
    this.comboBuffer = []; // Tracks directional inputs: 'front' or 'back'
    this.comboBufferTime = []; // Timestamps for combo inputs
    this.dashVelocity = 0; // Dash momentum
    this.lastComboTime = 0; // Timestamp of last successful combo
    this.prevFrontPress = false; // Track previous front press state
    this.prevBackPress = false; // Track previous back press state
    this.upBuffer = []; // Tracks down/up presses for backflip combo
    this.upBufferTime = []; // Timestamps for down/up presses
    this.isBackflipping = false; // Track if currently doing backflip
    this.backflipTimer = 0; // Duration of backflip animation
    this.prevUpPress = false; // Track previous up press state
    this.prevDownPress = false; // Track previous down press state
    this.facingRight = this.id === 0; // Default facing direction
  }
  setInput(input) {
        // Cancel punch if crouch (down) is pressed during attack
        if (input.down && this.isPunching) {
          this.isPunching = false;
          this.punchTimer = 0;
        }
    // Only keep relevant keys
    const allowedKeys = ['left', 'right', 'up', 'down', 'punch', 'kick'];
    this.input = {};
    for (const key of allowedKeys) {
      this.input[key] = !!input[key];
    }
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

    // Update facing direction based on input
    // If both left and right are pressed, keep previous direction
    if (input.left && !input.right) {
      this.facingRight = false;
    } else if (input.right && !input.left) {
      this.facingRight = true;
    }

    // Combo detection: double tap towards front
    // Track actual left/right presses
    let leftPress = !!input.left;
    let rightPress = !!input.right;
    let upPress = !!input.up;
    let downPress = !!input.down;

    // Determine front/back based on facing direction
    const frontDir = this.facingRight ? rightPress : leftPress;
    const backDir = this.facingRight ? leftPress : rightPress;

    // Clear combo buffer if inputs are too old (>500ms between first and latest)
    if (this.comboBuffer.length > 0 && Date.now() - this.comboBufferTime[0] > 500) {
      this.comboBuffer = [];
      this.comboBufferTime = [];
    }

    // Clear up buffer if inputs are too old (>400ms between first and latest)
    if (this.upBuffer.length > 0 && Date.now() - this.upBufferTime[0] > 400) {
      this.upBuffer = [];
      this.upBufferTime = [];
    }

    // Detect press (transition from false to true) rather than just checking if held
    const frontPressed = frontDir && !this.prevFrontPress;
    const backPressed = backDir && !this.prevBackPress;
    const upPressed = upPress && !this.prevUpPress;
    const downPressed = downPress && !this.prevDownPress;
    
    // Track this frame's state for next frame
    this.prevFrontPress = frontDir;
    this.prevBackPress = backDir;
    this.prevUpPress = upPress;
    this.prevDownPress = downPress;

    // Add to vertical buffer when down or up is newly pressed
    if (downPressed) {
      this.upBuffer.push('down');
      this.upBufferTime.push(Date.now());
      // Keep only last 2 inputs
      if (this.upBuffer.length > 2) {
        this.upBuffer.shift();
        this.upBufferTime.shift();
      }
    } else if (upPressed) {
      // Only add to upBuffer if the previous was 'down', to avoid blocking normal jumps
      if (this.upBuffer.length === 1 && this.upBuffer[0] === 'down') {
        this.upBuffer.push('up');
        this.upBufferTime.push(Date.now());
        // Keep only last 2 inputs
        if (this.upBuffer.length > 2) {
          this.upBuffer.shift();
          this.upBufferTime.shift();
        }
      }
      // For normal jump, do not clear input.up
    }

    // Check for down-up combo (backflip) within 300ms window
    if (
      this.upBuffer.length === 2 &&
      this.upBuffer[0] === 'down' &&
      this.upBuffer[1] === 'up' &&
      (this.upBufferTime[1] - this.upBufferTime[0] < 300)
    ) {
      const now = Date.now();
      const comboCooldown = 1000; // 1000ms cooldown between combos

      // Down-up combo: backflip with backward velocity
      if (now - this.lastComboTime >= comboCooldown && !this.isJumping) {
        // ...removed log...
        this.isJumping = true;
        this.isBackflipping = true;

        // Only clear the down input to prevent crouch on landing, but do NOT clear input.up (so jump can still register)
        this.input.down = false;

        // Calculate arc: move backward relative to facing direction
        const landingDistance = this.facingRight ? -100 : 100;
        const gravity = 2.4;
        const vy = -28; // Jump upward velocity for nice arc

        // Calculate landing time: y = y0 + vy*t + 0.5*gravity*t^2, solve for when y returns to floorY
        // 0 = vy*t + 0.5*gravity*t^2, so t = -2*vy/gravity
        const landingTimeFrames = -2 * vy / gravity; // in 16ms frames
        const landingTimeMs = landingTimeFrames * 16; // convert to milliseconds

        // Calculate vx needed to travel landingDistance in landingTimeFrames
        const vx = landingDistance / landingTimeFrames;

        this.vy = vy;
        this.vx = vx;
        this.backflipTimer = Math.max(550, landingTimeMs); // At least 550ms for faster rotation
        this.lastComboTime = now;
      }
      this.upBuffer = [];
      this.upBufferTime = [];
    }

    // Add to combo buffer when a direction is newly pressed
    if (frontPressed) {
      this.comboBuffer.push('front');
      this.comboBufferTime.push(Date.now());
      // Keep only last 2 inputs
      if (this.comboBuffer.length > 2) {
        this.comboBuffer.shift();
        this.comboBufferTime.shift();
      }
    } else if (backPressed) {
      // If a back is pressed, clear the combo buffer to prevent front-back-front from triggering dash
      this.comboBuffer = [];
      this.comboBufferTime = [];
    }

    // Check for double tap front combo within 500ms window
    if (
      this.comboBuffer.length === 2 &&
      this.comboBuffer[0] === 'front' &&
      this.comboBuffer[1] === 'front' &&
      (this.comboBufferTime[1] - this.comboBufferTime[0] < 500)
    ) {
      const now = Date.now();
      const comboCooldown = 1000; // 1000ms cooldown between combos
      
      // Double tap front: dash forward
      if (now - this.lastComboTime >= comboCooldown) {
        this.dashVelocity = this.facingRight ? 25 : -25;
        this.lastComboTime = now;
      }
      this.comboBuffer = [];
      this.comboBufferTime = [];
    } else if (
      this.comboBuffer.length === 2 &&
      this.comboBuffer[0] === 'back' &&
      this.comboBuffer[1] === 'back' &&
      (this.comboBufferTime[1] - this.comboBufferTime[0] < 500)
    ) {
      const now = Date.now();
      const comboCooldown = 1000; // 1000ms cooldown between combos
      
      // Double tap back: dash backward
      if (now - this.lastComboTime >= comboCooldown) {
        this.dashVelocity = this.id === 0 ? -25 : 25;
        this.lastComboTime = now;
      }
      this.comboBuffer = [];
      this.comboBufferTime = [];
    }
  }
  update(dt, otherPlayer) {
    const speed = 5;
    const jumpSpeed = 20;
    const gravity = 2.4;
    const floorY = 355;
    
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
    if (this.backflipTimer > 0) {
      this.backflipTimer -= dt;
      if (this.backflipTimer <= 0) {
        this.isBackflipping = false;
        this.backflipTimer = 0;
        this.isJumping = false; // Allow new backflip after timer ends
      }
    }

    // Apply dash velocity (decelerating dash movement)
    if (this.dashVelocity !== 0) {
      this.x += this.dashVelocity * dt / 16;
      this.dashVelocity *= 0.85; // Decelerate
      if (Math.abs(this.dashVelocity) < 0.5) this.dashVelocity = 0;

      // Stop dash if colliding with other player
      if (otherPlayer) {
        const dist = Math.abs(this.x - otherPlayer.x);
        if (dist < 40) {
          // Stop the dash
          this.dashVelocity = 0;
        }
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

    // DEBUG: Log input and jump state before jump logic (JUMPTRACE for easy search)
    if (this.input && typeof this.input === 'object') {
      // ...removed log...
    }

    // Only allow jump if up is held, not already jumping, on the ground, and NOT crouching
    if (this.input.up && !this.isJumping && this.y >= floorY - 1 && !this.input.down) {
      this.isJumping = true;
      this.vy = -jumpSpeed;
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
      this.justLanded = false;
    }

    // Apply jump physics (no collision during jump - allow jumping over)
    if (this.isJumping) {
      this.y += this.vy * dt / 16;
      this.x += this.vx * dt / 16;
      this.vy += gravity * dt / 16;
      // Clamp y to floor during backflip
      if (this.isBackflipping && this.y > floorY) {
        this.y = floorY;
      }
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
    return { x: this.x, y: this.y, isJumping: this.isJumping, isJumpingDiagonal: this.isJumpingDiagonal, health: this.health, down: !!this.input.down, isPunching: this.isPunching, isKicking: this.isKicking, isBackflipping: this.isBackflipping, facingRight: this.facingRight };
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
  getPlayerCount() {
    return Object.keys(this.players).length;
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
      if (dist < 70 && Math.abs(p0.y - p1.y) < 40) {
        // Player 0 attacks (only if not crouching, p1 blocks if crouched)
        if (!p0.input.down && !p1.input.down) {
          if (p0.justPunched) {
            p1.health -= 10;
          }
          if (p0.justKicked) {
            p1.health -= 15;
          }
        }
        // Player 1 attacks (only if not crouching, p0 blocks if crouched)
        if (!p1.input.down && !p0.input.down) {
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

function broadcastStatus(playerCount) {
  Object.values(game.players).forEach(player => {
    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({ type: 'status', playerCount }));
    }
  });
}


wss.on('connection', (ws) => {
  // Find the first available player slot (0 or 1)
  let playerId = -1;
  if (!game.players[0]) {
    playerId = 0;
  } else if (!game.players[1]) {
    playerId = 1;
  }
  
  if (playerId === -1) {
    ws.send(JSON.stringify({ type: 'full' }));
    ws.close();
    return;
  }
  game.addPlayer(playerId, ws);
  ws.send(JSON.stringify({ type: 'init', playerId }));
  // Broadcast player count to all connected players
  broadcastStatus(game.getPlayerCount());

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
    // Broadcast updated player count when a player disconnects
    broadcastStatus(game.getPlayerCount());
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


const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  // ...removed log...
});
