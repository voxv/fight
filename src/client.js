// Utility to check if a key is physically pressed
function isKeyPressed(key) {
  // Use our own tracking, but guard against undefined
  if (typeof window !== 'undefined' && window.isKeyDown && typeof window.isKeyDown === 'object') {
    return !!window.isKeyDown[key];
  }
  return false;
}
// Basic client for Mortal Kombat style game

import Phaser from 'phaser';

let ws;
if (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.')
) {
  ws = new WebSocket('ws://localhost:3000');
} else {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsHost = window.location.host;
  ws = new WebSocket(`${wsProtocol}://${wsHost}`);
}
let playerId = null;
let gameState = null;
let inputState = { left: false, right: false, up: false, down: false };
// Add punch and kick to inputState for server-side hit detection
inputState.punch = false;
inputState.kick = false;

const SPRITE_WIDTH = 140;
const SPRITE_HEIGHT = 160;
const FLOOR_Y = 450;
const IDLE_FRAME_DURATION = 300;

let phaserPlayers = [];
let idleFrame = 0;
let idleFrameTimer = 0;
let punchState = [false, false]; // Track punch state for each player
let punchTimer = [0, 0]; // Track punch animation duration for each player

class MainScene extends Phaser.Scene {
  constructor() {
    super('main');
  }
  preload() {
    // Load punch and kick sounds
    this.load.audio('punch', '/sounds/punch.mp3');
    this.load.audio('kick', '/sounds/kick.mp3');
                // Load crouch animation (3 frames, 160x160)
                this.load.spritesheet('crouch', '/animations/crouch.png', {
                  frameWidth: 160,
                  frameHeight: 160
                });
        this.load.spritesheet('run', '/animations/run_test2.png', {
          frameWidth: 140,
          frameHeight: 160
        });
        // Load kick animation (3 frames, 160x160)
        this.load.spritesheet('kick', '/animations/kick1.png', {
          frameWidth: 160,
          frameHeight: 160
        });
    this.load.spritesheet('idle', '/animations/idle_test.png', {
      frameWidth: SPRITE_WIDTH,
      frameHeight: SPRITE_HEIGHT
    });
    this.load.spritesheet('jumpn', '/animations/jumpn_test.png', {
      frameWidth: 160,
      frameHeight: 160
    });
      this.load.spritesheet('punch', '/animations/punch1.png', {
        frameWidth: 160,
        frameHeight: 160
      });
  }
  create() {
    // Add punch and kick sounds
    this.punchSound = this.sound.add('punch');
    this.kickSound = this.sound.add('kick');
              // Crouch animation (3 frames)
              this.anims.create({
                key: 'crouch',
                frames: this.anims.generateFrameNumbers('crouch', { start: 0, end: 2 }),
                frameRate: 24,
                repeat: 0
              });
        this.anims.create({
          key: 'run',
          frames: this.anims.generateFrameNumbers('run', { start: 0, end: 7 }),
          frameRate: 12,
          repeat: -1
        });
    // Draw floor
    this.floor = this.add.graphics();
    this.floor.lineStyle(4, 0x000000, 1);
    this.floor.beginPath();
    this.floor.moveTo(0, FLOOR_Y);
    this.floor.lineTo(800, FLOOR_Y);
    this.floor.strokePath();

    // Create player sprites
    phaserPlayers = [
      this.add.sprite(100, FLOOR_Y, 'idle', 0),
      this.add.sprite(500, FLOOR_Y, 'idle', 0)
    ];
    phaserPlayers.forEach(sprite => {
      sprite.setOrigin(0, 1); // bottom-left
      sprite.setScale(1, 1);
    });
    
    // Create health bars for each player
    this.healthBars = [null, null];
    this.healthTexts = [null, null];
    for (let i = 0; i < 2; i++) {
      // Health bar background
      this.healthBars[i] = this.add.graphics();
      // Health text
      this.healthTexts[i] = this.add.text(i === 0 ? 20 : 550, 20, 'HP: 100', { fontSize: '16px', fill: '#fff' });
    }
    // Create jump animation
    this.anims.create({
      key: 'jumpn',
      frames: this.anims.generateFrameNumbers('jumpn', { start: 0, end: 6 }),
      frameRate: 7,
      repeat: -1
    });
      this.anims.create({
        key: 'punch',
        frames: this.anims.generateFrameNumbers('punch', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: 0
      });
      // Kick animation (3 frames)
      this.anims.create({
        key: 'kick',
        frames: this.anims.generateFrameNumbers('kick', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: 0
      });
      // Track kick state and timer for each player
      this.kickState = [false, false];
      this.kickTimer = [0, 0];
  let punchState = [false, false]; // Track punch state for each player
  }
  update(time, delta) {
    // Animate idle
    idleFrameTimer += delta;
    if (idleFrameTimer > IDLE_FRAME_DURATION) {
      idleFrame = (idleFrame + 1) % 2;
      idleFrameTimer = 0;
    }
    // Update punch timers
    for (let i = 0; i < punchTimer.length; i++) {
      if (punchTimer[i] > 0) {
        punchTimer[i] -= delta;
        if (punchTimer[i] <= 0) {
          punchState[i] = false;
          punchTimer[i] = 0;
        }
      }
    }
    // Update kick timers
    if (!this.kickState) this.kickState = [false, false];
    if (!this.kickTimer) this.kickTimer = [0, 0];
    for (let i = 0; i < this.kickTimer.length; i++) {
      if (this.kickTimer[i] > 0) {
        this.kickTimer[i] -= delta;
        if (this.kickTimer[i] <= 0) {
          this.kickState[i] = false;
          this.kickTimer[i] = 0;
        }
      }
    }
    // Update player positions and frames
    if (gameState && gameState.boxes && gameState.boxes.length > 0) {
      // Track previous health to detect punch hits (outside forEach to persist between frames)
      if (!this.prevHealth) this.prevHealth = [500, 500];
      gameState.boxes.forEach((box, i) => {
        if (i >= phaserPlayers.length || !box) return;
        const sprite = phaserPlayers[i];
        sprite.x = box.x;
        sprite.y = box.y + 30;

        // Flip sprite based on movement direction
        if (i === playerId) {
          if (inputState.left && !inputState.right) {
            sprite.setFlipX(true);
          } else if (inputState.right && !inputState.left) {
            sprite.setFlipX(false);
          }
        } else {
          // For remote player, compare current and previous x to determine direction
          if (!sprite.prevX) sprite.prevX = sprite.x;
          if (sprite.x < sprite.prevX) {
            sprite.setFlipX(true);
          } else if (sprite.x > sprite.prevX) {
            sprite.setFlipX(false);
          }
          sprite.prevX = sprite.x;
        }

        // Play crouch animation if down arrow is pressed (local) or box.crouching (remote)
        const isCrouching = (i === playerId && inputState.down) || (i !== playerId && box && box.down);
        if (isCrouching) {
          if (sprite.anims.currentAnim?.key !== 'crouch' || sprite.texture.key !== 'crouch') {
            sprite.setTexture('crouch');
            sprite.setOrigin(0, 1);
            sprite.setDisplaySize(160, 160);
            sprite.play('crouch');
          }
        } else if ((i === playerId && this.kickState && this.kickState[i]) || (i !== playerId && box && box.isKicking)) {
          if (sprite.anims.currentAnim?.key !== 'kick' || sprite.texture.key !== 'kick') {
            sprite.setTexture('kick');
            sprite.setOrigin(0, 1);
            sprite.setDisplaySize(160, 160);
            sprite.play('kick');
            this.kickTimer[i] = 250; // Kick animation duration in ms (3 frames at 10 fps = 300ms, using 250 to be safe)
          }
        } else if ((i === playerId && punchState[i]) || (i !== playerId && box && box.isPunching)) {
          if (sprite.anims.currentAnim?.key !== 'punch' || sprite.texture.key !== 'punch') {
            sprite.setTexture('punch');
            sprite.setOrigin(0, 1);
            sprite.setDisplaySize(175, 160);
            sprite.play('punch');
            punchTimer[i] = 250;
          }
        } else if (box && box.isJumpingDiagonal) {
          // Use server state to detect diagonal jump
          if (sprite.anims.currentAnim?.key !== 'jumpn' || sprite.texture.key !== 'jumpn') {
            sprite.setTexture('jumpn');
            sprite.setOrigin(0, 1);
            sprite.setDisplaySize(160, 160);
            sprite.play('jumpn');
          }
        } else if ((i === playerId && (inputState.left || inputState.right) && !inputState.up) ||
                   (i !== playerId && gameState.boxes[i] && Math.abs(gameState.boxes[i].x - phaserPlayers[i].x) > 0)) {
          // Running animation for local player (based on input) or remote player (based on position change)
          if (sprite.anims.currentAnim?.key !== 'run' || sprite.texture.key !== 'run') {
            sprite.setTexture('run');
            sprite.setOrigin(0, 1);
            sprite.setDisplaySize(160, 160);
            sprite.play('run');
          }
        } else {
          if (sprite.anims.currentAnim?.key === 'jumpn' || sprite.anims.currentAnim?.key === 'run' || sprite.texture.key !== 'idle') {
            sprite.stop();
            sprite.setTexture('idle');
            sprite.setOrigin(0, 1);
            sprite.setDisplaySize(SPRITE_WIDTH, SPRITE_HEIGHT);
          }
          // Idle or other state
          let isIdle = true;
          if (i === playerId && (inputState.left || inputState.right || inputState.up)) {
            isIdle = false;
          }
          const frameToShow = isIdle ? idleFrame : 0;
          sprite.setFrame(frameToShow);
        }
        
        // Update health bar
        const health = box.health !== undefined ? box.health : 100;
        this.healthBars[i].clear();
        // Draw background (red)
        this.healthBars[i].fillStyle(0xff0000, 1);
        this.healthBars[i].fillRect(i === 0 ? 20 : 550, 20, 200, 20);
        // Only draw green if health > 0
        if (health > 0) {
          this.healthBars[i].fillStyle(0x00aa00, 1);
          const barWidth = Math.max(0, Math.min(200, (health / 500) * 200));
          this.healthBars[i].fillRect(i === 0 ? 20 : 550, 20, barWidth, 20);
        }
        // Update health text
        this.healthTexts[i].setText('HP: ' + Math.round(health));
        
        // Play punch/kick sound if local player lands a hit (opponent health decreased)
        if (i !== playerId && this.prevHealth && box.health < this.prevHealth[i]) {
          const damageDealt = this.prevHealth[i] - box.health;
          // 15 HP = kick, 10 HP = punch
          if (damageDealt >= 15 && this.kickSound) {
            this.kickSound.play();
            console.log('Playing kick sound! Damage:', damageDealt);
          } else if (damageDealt > 0 && this.punchSound) {
            this.punchSound.play();
            console.log('Playing punch sound! Damage:', damageDealt);
          }
        }
        
        // Update previous health for next frame
        if (this.prevHealth) this.prevHealth[i] = box.health;
      });
        // Check for win condition
        if (gameState.boxes && gameState.boxes.length === 2 && gameState.boxes[0] && gameState.boxes[1] && (gameState.boxes[0].health <= 0 || gameState.boxes[1].health <= 0)) {
          let winner = gameState.boxes[0].health <= 0 ? 2 : 1;
          if (!this.winPopupShown) {
            this.winPopupShown = true;
            this.blockInput = true;
            // Show popup centered in game field
            let popup = document.createElement('div');
            popup.style.position = 'absolute';
            popup.style.top = '50%';
            popup.style.left = '50%';
            popup.style.transform = 'translate(-50%, -50%)';
            popup.style.background = '#222';
            popup.style.color = '#fff';
            popup.style.padding = '40px 60px';
            popup.style.fontSize = '2em';
            popup.style.borderRadius = '20px';
            popup.style.zIndex = '9999';
            popup.innerText = `Player ${winner} wins!`;
            // Center relative to game field
            const gameDiv = document.getElementById('game-phaser');
            if (gameDiv) {
              gameDiv.style.position = 'relative';
              gameDiv.appendChild(popup);
            } else {
              document.body.appendChild(popup);
            }
            // Remove popup and reset after 5 seconds
            setTimeout(() => {
              if (popup.parentNode) popup.parentNode.removeChild(popup);
              this.winPopupShown = false;
              this.blockInput = false;
              // Reset game state (client-side only)
              if (window.location) window.location.reload();
            }, 5000);
          }
        } else {
          this.winPopupShown = false;
          this.blockInput = false;
        }
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#e0e0e0',
  scene: MainScene,
  parent: 'game-phaser',
};

window.onload = () => {
  const div = document.createElement('div');
  div.id = 'game-phaser';
  document.body.appendChild(div);
  window.game = new Phaser.Game(config);
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'init') {
    playerId = msg.playerId;
  } else if (msg.type === 'state') {
    gameState = msg.state;
  } else if (msg.type === 'full') {
    alert('Game is full!');
  }
};

function sendInput() {
  ws.send(JSON.stringify({ type: 'input', ...inputState, timestamp: Date.now() }));
}

// Track keydown state globally (for arrow keys only)
window.isKeyDown = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };

// Prevent repeated punch/kick on hold
let punchPressed = false;
let kickPressed = false;

document.addEventListener('keydown', (e) => {
  if (window.game && window.game.scene && window.game.scene.scenes) {
    const mainScene = window.game.scene.scenes.find(s => s.scene.key === 'main');
    if (mainScene && mainScene.blockInput) return;
  }
  // Track key state
  if (e.key in window.isKeyDown) window.isKeyDown[e.key] = true;
  
  if (playerId === null) return;
  let changed = false;
  // Prioritize run over crouch: pressing left/right while crouching cancels crouch
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && inputState.down) {
    inputState.down = false; changed = true;
  }
  if (e.key === 'ArrowLeft' && !inputState.left) { inputState.left = true; changed = true; }
  if (e.key === 'ArrowRight' && !inputState.right) { inputState.right = true; changed = true; }
  if (e.key === 'ArrowUp' && !inputState.up) { inputState.up = true; changed = true; }
  if (e.key === 'ArrowDown' && !inputState.down) {
    inputState.down = true; changed = true;
    // Cancel horizontal movement when crouching
    if (inputState.left) { inputState.left = false; changed = true; }
    if (inputState.right) { inputState.right = false; changed = true; }
  }
  if ((e.key === 'q' || e.key === 'Q') && !punchPressed) {
    punchPressed = true;
    punchState[playerId] = true;
    inputState.punch = true;
    sendInput();
    inputState.punch = false;
  }
  if ((e.key === 'w' || e.key === 'W') && !kickPressed) {
    kickPressed = true;
    // Set kick state for this player
    if (window.game && window.game.scene && window.game.scene.scenes) {
      const mainScene = window.game.scene.scenes.find(s => s.scene.key === 'main');
      if (mainScene && mainScene.kickState) mainScene.kickState[playerId] = true;
    }
    inputState.kick = true;
    sendInput();
    inputState.kick = false;
  }
  if (changed) {
    sendInput();
  }
});

document.addEventListener('keyup', (e) => {
  if (window.game && window.game.scene && window.game.scene.scenes) {
    const mainScene = window.game.scene.scenes.find(s => s.scene.key === 'main');
    if (mainScene && mainScene.blockInput) return;
  }
  // Track key state
  if (e.key in window.isKeyDown) window.isKeyDown[e.key] = false;
  
  if (playerId === null) return;
  let changed = false;
  if (e.key === 'ArrowLeft' && inputState.left) { inputState.left = false; changed = true; }
  if (e.key === 'ArrowRight' && inputState.right) { inputState.right = false; changed = true; }
  if (e.key === 'ArrowUp' && inputState.up) { inputState.up = false; changed = true; }
  if (e.key === 'ArrowDown' && inputState.down) {
    inputState.down = false; changed = true;
    // If left or right is still held, resume running
      if (isKeyPressed('ArrowLeft')) {
        if (!inputState.left) { inputState.left = true; changed = true; }
      }
      if (isKeyPressed('ArrowRight')) {
        if (!inputState.right) { inputState.right = true; changed = true; }
      }
  }
  if (e.key === 'q' || e.key === 'Q') {
    punchPressed = false;
    punchState[playerId] = false;
  }
  if (e.key === 'w' || e.key === 'W') {
    kickPressed = false;
    if (window.game && window.game.scene && window.game.scene.scenes) {
      const mainScene = window.game.scene.scenes.find(s => s.scene.key === 'main');
      if (mainScene && mainScene.kickState) mainScene.kickState[playerId] = false;
    }
  }
  if (changed) {
    sendInput();
  }
});

setInterval(() => {
  if (playerId !== null) sendInput();
}, 50);
