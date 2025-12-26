// Audio module for sound and music setup/playback

export function preloadAudio(scene) {
  scene.load.audio('punch', '/sounds/punch.mp3');
  scene.load.audio('kick', '/sounds/kick.mp3');
  scene.load.audio('background', '/sounds/background.mp3');
  scene.load.audio('death', '/sounds/death.mp3');
}

export function createAudio(scene) {
  return {
    punchSound: scene.sound.add('punch'),
    kickSound: scene.sound.add('kick'),
    backgroundMusic: scene.sound.add('background', { loop: true, volume: 0.5 }),
    deathSound: scene.sound.add('death')
  };
}
