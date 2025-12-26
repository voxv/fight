// preloadAssets.js - Centralized asset preloading

export function preloadAssets(scene) {
        // Fighter attack spritesheet (6 frames, 623x96)
        scene.load.spritesheet('fighter_attack', '/animations/fighter_attack.png', {
          frameWidth: 103.833,
          frameHeight: 96
        });
    // Fighter crouch spritesheet (2 frames, 283x104)
    scene.load.spritesheet('fighter_crouch', '/animations/fighter_crouch.png', {
      frameWidth: 141.5,
      frameHeight: 104
    });
  // Audio is handled by AudioManager

  // Spritesheets
  scene.load.spritesheet('knight_attack', '/animations/knight_attack.png', {
    frameWidth: 128,
    frameHeight: 84
  });
  scene.load.spritesheet('run', '/animations/run_test2.png', {
    frameWidth: 140,
    frameHeight: 160
  });
  scene.load.spritesheet('knight_run', '/animations/knight_run.png', {
    frameWidth: 85,
    frameHeight: 90
  });
  scene.load.spritesheet('knight_jump', '/animations/knight_jump.png', {
    frameWidth: 85,
    frameHeight: 135
  });
  scene.load.spritesheet('knight_crouch', '/animations/knight_crouch.png', {
    frameWidth: 85,
    frameHeight: 90
  });
  scene.load.spritesheet('kick', '/animations/kick1.png', {
    frameWidth: 160,
    frameHeight: 160
  });
  scene.load.spritesheet('idle', '/animations/idle_test.png', {
    frameWidth: 140,
    frameHeight: 160
  });
  scene.load.spritesheet('knight_idle', '/animations/knight_idle.png', {
    frameWidth: 85,
    frameHeight: 86
  });
  scene.load.spritesheet('jumpn', '/animations/jumpn_test.png', {
    frameWidth: 160,
    frameHeight: 160
  });
  scene.load.spritesheet('punch', '/animations/punch1.png', {
    frameWidth: 160,
    frameHeight: 160
  });
  scene.load.spritesheet('fighter_idle', '/animations/fighter_idle.png', {
    frameWidth: 67.5,
    frameHeight: 74
  });
  scene.load.spritesheet('fighter_run', '/animations/fighter_run.png', {
    frameWidth: 71.6667, // 645 / 9
    frameHeight: 78
  });
  scene.load.spritesheet('fighter_jump', '/animations/fighter_jump.png', {
    frameWidth: 65.8, // 329 / 5
    frameHeight: 109
  });

  // Images
  scene.load.image('background', '/images/background.png');
}
