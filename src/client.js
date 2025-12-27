import { isKeyPressed } from './utils.js';
import { characterDisplayConfig } from './config/characterDisplayConfig.js';
// Basic client for Mortal Kombat style game

import Phaser from 'phaser';
import { createHealthBars, updateHealthBars, showWinPopup } from './ui.js';
import { AudioManager } from './audioManager.js';
import { preloadAssets } from './preloadAssets.js';
import { createKnightAnimations } from './KnightCharacter.js';
import { createFighterAnimations } from './FighterCharacter.js';
import { Player } from './Player.js';
import { setupScene, teardownScene } from './SceneManager.js';

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
const FLOOR_Y = 355;
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
    // Load all audio using AudioManager
    this.audioManager = new AudioManager(this);
    this.audioManager.preload();
    // Load all other assets using preloadAssets
    preloadAssets(this);
  }
  create() {
    // Use SceneManager for setup
    setupScene(this);

    // Create and play audio using AudioManager
    this.audioManager.create();
    this.audioManager.play('background');

    // Create all knight and fighter animations using character modules
    createKnightAnimations(this);
    createFighterAnimations(this);

      // Create player sprites and Player instances
      phaserPlayers = [
        new Player(this, this.add.sprite(100, FLOOR_Y, 'fighter_idle', 0), { health: 500 }),
        new Player(this, this.add.sprite(500, FLOOR_Y, 'knight_idle', 0), { health: 500 })
      ];
      phaserPlayers.forEach(player => {
        player.sprite.setOrigin(0, 1); // bottom-left
        player.sprite.setScale(1, 1);
        player.sprite.setDepth(10);
        const shadowGraphics = this.add.graphics();
        player.sprite.shadowGraphics = shadowGraphics;
      });

    // Create health bars and texts using UI module
    const ui = createHealthBars(this);
    this.healthBars = ui.healthBars;
    this.healthTexts = ui.healthTexts;

    // Track kick state and timer for each player
    this.kickState = [false, false];
    this.kickTimer = [0, 0];
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
      
        for (let i = 0; i < phaserPlayers.length; i++) {
          if (i < gameState.boxes.length && gameState.boxes[i]) {
            phaserPlayers[i].sprite.setVisible(true);
          } else {
            phaserPlayers[i].sprite.setVisible(false);
          }
        }
      // Update player state from gameState.boxes
      gameState.boxes.forEach((box, i) => {
        if (i >= phaserPlayers.length || !box) return;
        const player = phaserPlayers[i];
        player.updateFromBox(box);
        // ...existing animation and state logic, now use player.sprite and player.state...
      });
      
      gameState.boxes.forEach((box, i) => {
        if (i >= phaserPlayers.length || !box) return;
        const player = phaserPlayers[i];
        const sprite = player.sprite;
        sprite.x = box.x;
        // Y position will be set based on the character's current state below
        // No tint applied

        // Scale up slightly and set additive blend to make characters bold and distinct
        sprite.setScale(1.1);
        sprite.setBlendMode(Phaser.BlendModes.NORMAL);

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

        // Centralized config for all scaling and offset values
        const isKnight = i === 1;
        const charType = isKnight ? 'knight' : 'fighter';
        const config = characterDisplayConfig[charType];
        const isCrouching = (i === playerId && inputState.down) || (i !== playerId && box && box.down);
        // Determine if punch animation should play (local: punchState[i], remote: box.isPunching)
        const isPunching = (i === playerId && punchState[i]) || (i !== playerId && box && box.isPunching);

        // --- FIX: Reset backflipStartTime if not backflipping ---
        if (!((i === playerId && box && box.isBackflipping) || (i !== playerId && box && box.isBackflipping))) {
          backflipStartTime[i] = null;
        }

        if (box.health <= 0) {
          sprite.stop();
          if (isKnight) {
            sprite.setTexture('knight_idle');
          } else {
            sprite.setTexture('fighter_idle');
          }
          sprite.setOrigin(0.5, 0.5);
          sprite.setDisplaySize(config.dead.width, config.dead.height);
          sprite.setFrame(0);
          sprite.y = box.y + config.dead.yOffset;
          sprite.setRotation(sprite.flipX ? Math.PI / 2 : -Math.PI / 2);
        } else if (isCrouching) {
          const crouchKey = isKnight ? 'knight_crouch' : 'fighter_crouch';
          if (sprite.anims.currentAnim?.key !== crouchKey || sprite.texture.key !== crouchKey) {
            sprite.setTexture(crouchKey);
            sprite.setOrigin(0, 1);
            if (isKnight) {
              sprite.play('knight_crouch');
            } else {
              sprite.setFrame(1);
            }
          }
          // Always set display size for crouch every frame
          sprite.setDisplaySize(config.crouch.width, config.crouch.height);
          sprite.y = box.y + config.crouch.yOffset;
        } else if (((i === playerId && this.kickState && this.kickState[i]) || (i !== playerId && box && box.isKicking)) && !isPunching) {
          if (isKnight) {
            if (sprite.anims.currentAnim?.key !== 'knight_attack' || sprite.texture.key !== 'knight_attack') {
              sprite.setTexture('knight_attack');
              sprite.setOrigin(0, 1);
              if (sprite.flipX) {
                sprite.setDisplaySize(config.attackFlip.width, config.attackFlip.height);
              } else {
                sprite.setDisplaySize(config.attack.width, config.attack.height);
              }
              sprite.play('knight_attack');
              this.kickTimer[i] = 320;
            }
            if (sprite.flipX) {
              sprite.setDisplaySize(config.attackFlip.width, config.attackFlip.height);
            } else {
              sprite.setDisplaySize(config.attack.width, config.attack.height);
            }
            sprite.y = box.y + config.attack.yOffset;
            sprite.x = box.x + (sprite.flipX ? config.attack.xOffset.left : config.attack.xOffset.right);
          } else {
            if (sprite.anims.currentAnim?.key !== 'fighter_attack' || sprite.texture.key !== 'fighter_attack') {
              sprite.setTexture('fighter_attack');
              sprite.setOrigin(0, 1);
              sprite.play('fighter_attack');
              this.kickTimer[i] = 250;
            }
            // Always use config.kick for fighter's kick
            sprite.setDisplaySize(config.kick.width, config.kick.height);
            sprite.y = box.y + config.kick.yOffset;
            sprite.x = box.x + (sprite.flipX ? config.kick.xOffset.left : config.kick.xOffset.right);
          }
        } else if ((i === playerId && box && box.isBackflipping) || (i !== playerId && box && box.isBackflipping)) {
          sprite.stop();
          // Clamp y to FLOOR_Y during backflip so sprite never dips below the floor
          const clampedY = Math.min(box.y, FLOOR_Y);
          if (isKnight) {
            // Force knight_idle texture and frame 0 every frame during backflip
            sprite.anims.stop();
            sprite.setTexture('knight_idle');
            sprite.setOrigin(0, 1); // Align bottom-left to floor
            sprite.setFrame(0);
            sprite.y = clampedY + config.backflip.yOffset;
            sprite.setDisplaySize(config.backflip.width, config.backflip.height);
          } else {
            sprite.setTexture('fighter_idle');
            sprite.setOrigin(0, 1); // Align bottom-left to floor
            sprite.setDisplaySize(config.backflip.width, config.backflip.height);
            sprite.y = clampedY + config.backflip.yOffset;
          }
          if (box.facingRight !== undefined) {
            sprite.setFlipX(!box.facingRight);
          }
          if (backflipStartTime[i] === null) {
            backflipStartTime[i] = Date.now();
          }
          const elapsedTime = Date.now() - backflipStartTime[i];
          const backflipProgress = Math.min(elapsedTime / BACKFLIP_DURATION, 1);
          const rotationDir = box.facingRight ? -1 : 1;
          sprite.setRotation(rotationDir * backflipProgress * Math.PI * 2);
          if (isKnight) {
            if (sprite.anims.currentAnim?.key !== 'knight_attack' || sprite.texture.key !== 'knight_attack') {
              sprite.setTexture('knight_attack');
              sprite.setOrigin(0, 1);
              if (sprite.flipX) {
                sprite.setDisplaySize(config.attackFlip.width, config.attackFlip.height);
              } else {
                sprite.setDisplaySize(config.attack.width, config.attack.height);
              }
              sprite.play('knight_attack');
              punchTimer[i] = 320;
            }
            if (sprite.flipX) {
              sprite.setDisplaySize(config.attackFlip.width, config.attackFlip.height);
            } else {
              sprite.setDisplaySize(config.attack.width, config.attack.height);
            }
            sprite.y = box.y + config.attack.yOffset;
            sprite.x = box.x + (sprite.flipX ? config.attack.xOffset.left : config.attack.xOffset.right);
          } else {
            if (sprite.anims.currentAnim?.key !== 'fighter_attack' || sprite.texture.key !== 'fighter_attack') {
              sprite.setTexture('fighter_attack');
              sprite.setOrigin(0, 1);
              sprite.play('fighter_attack');
              punchTimer[i] = 250;
            }
            // Always use config.attack for fighter's punch
            sprite.setDisplaySize(config.attack.width, config.attack.height);
            sprite.y = box.y + config.attack.yOffset;
            sprite.x = box.x + (sprite.flipX ? config.attack.xOffset.left : config.attack.xOffset.right);
          }
        } else if (isPunching) {
          if (isKnight) {
            if (sprite.anims.currentAnim?.key !== 'knight_attack' || sprite.texture.key !== 'knight_attack') {
              sprite.setTexture('knight_attack');
              sprite.setOrigin(0, 1);
              if (sprite.flipX) {
                sprite.setDisplaySize(config.attackFlip.width, config.attackFlip.height);
              } else {
                sprite.setDisplaySize(config.attack.width, config.attack.height);
              }
              sprite.play('knight_attack');
              punchTimer[i] = 320;
            }
            if (sprite.flipX) {
              sprite.setDisplaySize(config.attackFlip.width, config.attackFlip.height);
            } else {
              sprite.setDisplaySize(config.attack.width, config.attack.height);
            }
            sprite.y = box.y + config.attack.yOffset;
            sprite.x = box.x + (sprite.flipX ? config.attack.xOffset.left : config.attack.xOffset.right);
          } else {
            if (sprite.anims.currentAnim?.key !== 'fighter_attack' || sprite.texture.key !== 'fighter_attack') {
              sprite.setTexture('fighter_attack');
              sprite.setOrigin(0, 1);
              sprite.play('fighter_attack');
              punchTimer[i] = 250;
            }
            // Always use config.attack for fighter's punch
            sprite.setDisplaySize(config.attack.width, config.attack.height);
            sprite.y = box.y + config.attack.yOffset;
            sprite.x = box.x + (sprite.flipX ? config.attack.xOffset.left : config.attack.xOffset.right);
          }
        } else if (box && (box.isJumping || box.isJumpingDiagonal)) {
          const jumpKey = isKnight ? 'knight_jump' : 'fighter_jump';
          if (sprite.anims.currentAnim?.key !== jumpKey || sprite.texture.key !== jumpKey) {
            sprite.setTexture(jumpKey);
            sprite.setOrigin(0, 1);
            sprite.play(jumpKey);
          }
          sprite.setDisplaySize(config.jump.width, config.jump.height);
          sprite.y = box.y + config.jump.yOffset;
        } else if ((i === playerId && (inputState.left || inputState.right) && !inputState.up) ||
                   (i !== playerId && gameState.boxes[i] && Math.abs(gameState.boxes[i].x - phaserPlayers[i].x) > 0)) {
          const runKey = isKnight ? 'knight_run' : 'fighter_run';
          if (sprite.anims.currentAnim?.key !== runKey || sprite.texture.key !== runKey) {
            sprite.setTexture(runKey);
            sprite.setOrigin(0, 1);
            sprite.play(runKey);
          }
          sprite.setDisplaySize(config.run.width, config.run.height);
          sprite.y = box.y + config.run.yOffset;
        } else {
          if (box.y === FLOOR_Y) {
            if (sprite.originY !== 1) {
              sprite.setOrigin(0, 1);
              sprite.setRotation(0);
              backflipStartTime[i] = null;
            }
            // Always set display size for idle every frame
            sprite.setDisplaySize(config.idle.width, config.idle.height);
            if (sprite.anims.currentAnim?.key === 'jumpn' || sprite.anims.currentAnim?.key === 'run' || sprite.texture.key !== 'idle' && sprite.texture.key !== 'knight_idle') {
              sprite.stop();
              if (isKnight) {
                sprite.setTexture('knight_idle');
                sprite.play('knight_idle');
              } else {
                sprite.setTexture('fighter_idle');
                sprite.play('fighter_idle');
              }
            }
            sprite.y = box.y + config.idle.yOffset;
            if (box.facingRight !== undefined) {
              sprite.setFlipX(!box.facingRight ? true : false);
            }
            let isIdle = true;
            if (i === playerId && (inputState.left || inputState.right || inputState.up)) {
              isIdle = false;
            }
            const frameToShow = isIdle ? idleFrame : 0;
            sprite.setFrame(frameToShow);
          }
        }
        // Update health bars and texts using UI module
        updateHealthBars(this.healthBars, this.healthTexts, gameState.boxes);
        // Play punch/kick sound if local player lands a hit (opponent health decreased)
        if (i !== playerId && this.prevHealth && box.health < this.prevHealth[i]) {
          const damageDealt = this.prevHealth[i] - box.health;
          // 15 HP = kick, 10 HP = punch
          if (damageDealt >= 15) {
            this.audioManager.play('kick');
            console.log('Playing kick sound! Damage:', damageDealt);
          } else if (damageDealt > 0) {
            this.audioManager.play('punch');
            console.log('Playing punch sound! Damage:', damageDealt);
          }
        }
        // Update previous health for next frame
        if (this.prevHealth) this.prevHealth[i] = box.health;
      });

      // Check for win condition
      if (gameState.boxes && gameState.boxes.length === 2 && gameState.boxes[0] && gameState.boxes[1] && (gameState.boxes[0].health <= 0 || gameState.boxes[1].health <= 0)) {
        let winnerIndex = gameState.boxes[0].health <= 0 ? 1 : 0;
        let isYouWinner = (winnerIndex === playerId);
        if (!this.winPopupShown) {
          this.winPopupShown = true;
          this.blockInput = true;
          this.audioManager.play('death');
          // Use UI module to show win/lose popup
          showWinPopup(isYouWinner, () => {
            this.winPopupShown = false;
            this.blockInput = false;
            if (window.location) window.location.reload();
          });
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
  } else if (msg.type === 'status') {
    // Handle background music based on player count
    if (window.game && window.game.scene && window.game.scene.scenes) {
      const mainScene = window.game.scene.scenes.find(s => s.scene.key === 'main');
      if (mainScene && mainScene.backgroundMusic) {
        if (msg.playerCount === 2) {
          // Start background music when 2 players are connected
          if (!mainScene.backgroundMusic.isPlaying) {
            mainScene.backgroundMusic.play();
          }
        } else {
          // Stop background music when players disconnect
          if (mainScene.backgroundMusic.isPlaying) {
            mainScene.backgroundMusic.stop();
          }
        }
      }
    }
  } else if (msg.type === 'full') {
    alert('Game is full!');
  }
};

function sendInput() {
  ws.send(JSON.stringify({ type: 'input', ...inputState, timestamp: Date.now() }));
}

// Track keydown state globally (for arrow keys only)
window.isKeyDown = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };

// Track backflip animation progress for smooth rotation
let backflipStartTime = [null, null];
const BACKFLIP_DURATION = 400; // milliseconds (reduced from 800 for faster rotation)

// Prevent repeated punch/kick on hold
let punchPressed = false;
let kickPressed = false;

document.addEventListener('keydown', (e) => {
    // Prevent starting a backflip combo while attacking (punch or kick)
    if (
      playerId !== null &&
      gameState &&
      gameState.boxes &&
      gameState.boxes[playerId] &&
      (gameState.boxes[playerId].isPunching || gameState.boxes[playerId].isKicking) &&
      (e.key === 'ArrowDown' || e.key === 'ArrowUp')
    ) {
      console.log(`[DEBUG] Input blocked for backflip during attack for key: ${e.key}`);
      return;
    }
  // Debug: log keydown and backflip state
  if (playerId !== null && gameState && gameState.boxes && gameState.boxes[playerId]) {
    const box = gameState.boxes[playerId];
    console.log(`[DEBUG] Keydown: ${e.key}, isBackflipping: ${box.isBackflipping}, isJumping: ${box.isJumping}, y: ${box.y}`);
  }
  if (window.game && window.game.scene && window.game.scene.scenes) {
    const mainScene = window.game.scene.scenes.find(s => s.scene.key === 'main');
    if (mainScene && mainScene.blockInput) return;
  }
  // Block all input if player is backflipping
  if (
    playerId !== null &&
    gameState &&
    gameState.boxes &&
    gameState.boxes[playerId] &&
    gameState.boxes[playerId].isBackflipping
  ) {
    console.log(`[DEBUG] Input blocked during backflip for key: ${e.key}`);
    return;
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
  // If both punch and kick are pressed at the same time, only register punch
  if ((e.key === 'q' || e.key === 'Q') && !punchPressed && !kickPressed) {
    punchPressed = true;
    punchState[playerId] = true;
    inputState.punch = true;
    sendInput();
    inputState.punch = false;
  } else if ((e.key === 'w' || e.key === 'W') && !kickPressed && !punchPressed) {
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
  // Debug: log keyup and backflip state
  if (playerId !== null && gameState && gameState.boxes && gameState.boxes[playerId]) {
    const box = gameState.boxes[playerId];
    console.log(`[DEBUG] Keyup: ${e.key}, isBackflipping: ${box.isBackflipping}, isJumping: ${box.isJumping}, y: ${box.y}`);
  }
  if (window.game && window.game.scene && window.game.scene.scenes) {
    const mainScene = window.game.scene.scenes.find(s => s.scene.key === 'main');
    if (mainScene && mainScene.blockInput) return;
  }
  // Block all input if player is backflipping
  if (
    playerId !== null &&
    gameState &&
    gameState.boxes &&
    gameState.boxes[playerId] &&
    gameState.boxes[playerId].isBackflipping
  ) {
    console.log(`[DEBUG] Input blocked during backflip for key: ${e.key}`);
    return;
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
    console.log(`[DEBUG] Sending input after key event: ${e.key}, inputState:`, JSON.stringify(inputState));
    sendInput();
  }
});

setInterval(() => {
  if (playerId !== null) {
    // Block up/down inputs while backflipping to prevent bouncing
    if (gameState && gameState.boxes && gameState.boxes[playerId] && gameState.boxes[playerId].isBackflipping) {
      inputState.up = false;
      inputState.down = false;
    }
    sendInput();
  }
}, 50);
