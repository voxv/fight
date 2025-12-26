// FighterCharacter.js
// Handles fighter-specific animation creation and logic

export function createFighterAnimations(scene) {
        scene.anims.create({
          key: 'fighter_attack',
          frames: scene.anims.generateFrameNumbers('fighter_attack', { start: 0, end: 5 }),
          frameRate: 12,
          repeat: 0
        });
    scene.anims.create({
      key: 'fighter_crouch',
      frames: scene.anims.generateFrameNumbers('fighter_crouch', { start: 0, end: 1 }),
      frameRate: 6, // Faster to ensure frame switch is visible
      repeat: 0 // Do not loop crouch animation
    });
  scene.anims.create({
    key: 'run',
    frames: scene.anims.generateFrameNumbers('run', { start: 0, end: 7 }),
    frameRate: 12,
    repeat: -1
  });
  scene.anims.create({
    key: 'jumpn',
    frames: scene.anims.generateFrameNumbers('jumpn', { start: 0, end: 6 }),
    frameRate: 7,
    repeat: -1
  });
  scene.anims.create({
    key: 'idle',
    frames: scene.anims.generateFrameNumbers('idle', { start: 0, end: 6 }),
    frameRate: 3,
    repeat: -1
  });
  scene.anims.create({
    key: 'punch',
    frames: scene.anims.generateFrameNumbers('punch', { start: 0, end: 2 }),
    frameRate: 10,
    repeat: 0
  });
  scene.anims.create({
    key: 'kick',
    frames: scene.anims.generateFrameNumbers('punch', { start: 0, end: 2 }),
    frameRate: 10,
    repeat: 0
  });
  scene.anims.create({
    key: 'fighter_idle',
    frames: scene.anims.generateFrameNumbers('fighter_idle', { start: 0, end: 5 }),
    frameRate: 3,
    repeat: -1
  });
  scene.anims.create({
    key: 'fighter_run',
    frames: scene.anims.generateFrameNumbers('fighter_run', { start: 0, end: 5 }),
    frameRate: 7,
    repeat: -1
  });
  scene.anims.create({
    key: 'fighter_jump',
    frames: scene.anims.generateFrameNumbers('fighter_jump', { start: 0, end: 4 }),
    frameRate: 6,
    repeat: -1
  });
}
