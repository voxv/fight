// KnightCharacter.js
// Handles knight-specific animation creation and logic

export function createKnightAnimations(scene) {
  scene.anims.create({
    key: 'knight_attack',
    frames: scene.anims.generateFrameNumbers('knight_attack', { start: 0, end: 4 }),
    frameRate: 16,
    repeat: 0
  });
  scene.anims.create({
    key: 'knight_crouch',
    frames: scene.anims.generateFrameNumbers('knight_crouch', { start: 0, end: 4 }),
    frameRate: 24,
    repeat: 0
  });
  scene.anims.create({
    key: 'knight_run',
    frames: scene.anims.generateFrameNumbers('knight_run', { start: 0, end: 7 }),
    frameRate: 12,
    repeat: -1
  });
  scene.anims.create({
    key: 'knight_jump',
    frames: scene.anims.generateFrameNumbers('knight_jump', { start: 0, end: 7 }),
    frameRate: 7,
    repeat: -1
  });
  scene.anims.create({
    key: 'knight_idle',
    frames: scene.anims.generateFrameNumbers('knight_idle', { start: 0, end: 6 }),
    frameRate: 3,
    repeat: -1
  });
}
