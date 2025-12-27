// Input handling module for fight game
// Handles keyboard events and input state

let inputState = { left: false, right: false, up: false, down: false, punch: false, kick: false };
let punchPressed = false;
let kickPressed = false;
let punchState = [false, false];

// Utility to check if a key is physically pressed
function isKeyPressed(key) {
  if (typeof window !== 'undefined' && window.isKeyDown && typeof window.isKeyDown === 'object') {
    return !!window.isKeyDown[key];
  }
  return false;
}

// Track keydown state globally (for arrow keys only)
window.isKeyDown = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };

function setupInputHandlers(sendInput, getPlayerId, getGameState) {
  document.addEventListener('keydown', (e) => {
    // DEBUG: Log key pressed
    // ...removed log...
    const playerId = getPlayerId();
    const gameState = getGameState();
    if (window.game && window.game.scene && window.game.scene.scenes) {
      const mainScene = window.game.scene.scenes.find(s => s.scene.key === 'main');
      if (mainScene && mainScene.blockInput) return;
    }
    if (playerId !== null && gameState && gameState.boxes && gameState.boxes[playerId] && gameState.boxes[playerId].isBackflipping) {
      return;
    }
    if (e.key in window.isKeyDown) window.isKeyDown[e.key] = true;
    if (playerId === null) return;

    // Update inputState for each key
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && inputState.down) {
      inputState.down = false;
    }
    if (e.key === 'ArrowLeft') { inputState.left = true; }
    if (e.key === 'ArrowRight') { inputState.right = true; }
    if (e.key === 'ArrowUp') {
      inputState.up = true;
      // Do NOT clear crouch when up is pressed; holding down should block jump
      // Always include current attack state if attack key is held
      if (punchPressed) inputState.punch = true;
      if (kickPressed) inputState.kick = true;
    }
    if (e.key === 'ArrowDown') {
      // Only allow crouch if not jumping (client-side check)
      let isJumping = false;
      if (typeof gameState === 'object' && gameState && typeof playerId === 'number' && gameState.boxes && gameState.boxes[playerId]) {
        isJumping = !!(gameState.boxes[playerId].isJumping || gameState.boxes[playerId].isJumpingDiagonal);
      }
      if (!isJumping) {
        inputState.down = true;
        // Cancel punch and kick immediately when crouching
        inputState.punch = false;
        inputState.kick = false;
        punchPressed = false;
        kickPressed = false;
        if (inputState.left) { inputState.left = false; }
        if (inputState.right) { inputState.right = false; }
      }
    }
    if ((e.key === 'q' || e.key === 'Q') && !punchPressed) {
      punchPressed = true;
      punchState[playerId] = true;
      inputState.punch = true;
    }
    if ((e.key === 'w' || e.key === 'W') && !kickPressed) {
      kickPressed = true;
      inputState.kick = true;
    }

    // Always send the full current input state on every keydown
    // ...removed log...
    sendInput({ ...inputState });
  });

  document.addEventListener('keyup', (e) => {
    const playerId = getPlayerId();
    const gameState = getGameState();
    if (window.game && window.game.scene && window.game.scene.scenes) {
      const mainScene = window.game.scene.scenes.find(s => s.scene.key === 'main');
      if (mainScene && mainScene.blockInput) return;
    }
    if (playerId !== null && gameState && gameState.boxes && gameState.boxes[playerId] && gameState.boxes[playerId].isBackflipping) {
      return;
    }
    if (e.key in window.isKeyDown) window.isKeyDown[e.key] = false;
    if (playerId === null) return;
    let changed = false;
    if (e.key === 'ArrowLeft' && inputState.left) { inputState.left = false; changed = true; }
    if (e.key === 'ArrowRight' && inputState.right) { inputState.right = false; changed = true; }
    if (e.key === 'ArrowUp' && inputState.up) { inputState.up = false; changed = true; }
    if (e.key === 'ArrowDown' && inputState.down) {
      inputState.down = false; changed = true;
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
      inputState.punch = false;
      sendInput({ ...inputState });
    }
    if (e.key === 'w' || e.key === 'W') {
      kickPressed = false;
      inputState.kick = false;
      sendInput({ ...inputState });
    }
    if (changed) {
      sendInput({ ...inputState });
    }
  });
}

function getInputState() {
  return { ...inputState };
    if (inputState.up) {
      // ...removed log...
    }
}

export { setupInputHandlers, getInputState, isKeyPressed, punchState };
