// SceneManager.js
// Handles setup and teardown for Phaser scenes

export function setupScene(scene) {
  // Add background image and stretch to fill screen
  const background = scene.add.image(400, 300, 'background');
  background.setDisplaySize(800, 600);
  return background;
}

export function teardownScene(scene) {
  // Remove all children and clean up
  scene.children.removeAll();
  // Optionally stop music, animations, etc.
  if (scene.audio && scene.audio.backgroundMusic) {
    scene.audio.backgroundMusic.stop();
  }
}
