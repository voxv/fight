// Player.js
// Handles player/character logic (movement, state, physics)

export class Player {
  constructor(scene, sprite, config = {}) {
    this.scene = scene;
    this.sprite = sprite;
    this.config = config;
    this.state = {
      x: sprite.x,
      y: sprite.y,
      health: config.health || 500,
      isJumping: false,
      isCrouching: false,
      isPunching: false,
      isKicking: false,
      facingRight: true
    };
  }

  updateFromBox(box) {
    this.state.x = box.x;
    this.state.y = box.y;
    this.state.health = box.health;
    this.state.facingRight = box.facingRight;
    // ...add more state sync as needed
  }

  setAnimation(animKey) {
    if (this.sprite.anims.currentAnim?.key !== animKey) {
      this.sprite.setTexture(animKey);
      this.sprite.play(animKey);
    }
  }

  setPosition(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
  }

  setHealth(health) {
    this.state.health = health;
  }

  // Add more player logic as needed (jump, crouch, punch, kick, etc.)
}
