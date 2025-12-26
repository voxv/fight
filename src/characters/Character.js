// Character base class for modular animation and sprite logic
export default class Character {
  constructor(scene, playerIndex) {
    this.scene = scene;
    this.playerIndex = playerIndex;
    this.sprite = null;
  }

  // Load all animations for this character (override in subclasses)
  static preload(scene) {}

  // Create all animations for this character (override in subclasses)
  static createAnimations(scene) {}

  // Create the Phaser sprite for this character
  createSprite(x, y, texture, frame = 0) {
    this.sprite = this.scene.add.sprite(x, y, texture, frame);
    this.sprite.setOrigin(0, 1);
    this.sprite.setScale(1, 1);
    this.sprite.setDepth(10);
    this.sprite.shadowGraphics = this.scene.add.graphics();
    return this.sprite;
  }

  // Update the sprite based on state (override in subclasses)
  update(box, inputState, state) {}
}
