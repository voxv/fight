import Character from './Character.js';

export default class FighterCharacter extends Character {
  static preload(scene) {
    scene.load.spritesheet('fighter_idle', '/animations/fighter_idle.png', { frameWidth: 67.5, frameHeight: 74 });
  }

  static createAnimations(scene) {
    scene.anims.create({ key: 'fighter_idle', frames: scene.anims.generateFrameNumbers('fighter_idle', { start: 0, end: 5 }), frameRate: 3, repeat: -1 });
    scene.anims.create({
      key: 'fighter_crouch',
      frames: scene.anims.generateFrameNumbers('fighter_crouch', { start: 0, end: 1 }),
      frameRate: 6,
      repeat: -1
    });
  }

  createSprite(x, y) {
    return super.createSprite(x, y, 'fighter_idle', 0);
  }

  update(box, inputState, state) {
    if (box && box.y === 355 && !inputState.left && !inputState.right && !inputState.up && !inputState.down) {
      this.sprite.setTexture('fighter_idle');
      this.sprite.setOrigin(0, 1);
      this.sprite.setDisplaySize(67.5 * 1.5, 74 * 1.5);
      this.sprite.play('fighter_idle', true);
      this.sprite.y = box.y + 15;
      return;
    }
    if ((inputState.left || inputState.right) && !inputState.up) {
      if (this.sprite.anims.animationManager.exists('fighter_run')) {
        this.sprite.setTexture('fighter_run');
        this.sprite.setOrigin(0, 1);
        this.sprite.setDisplaySize(67.5 * 1.5, 74 * 1.5);
        this.sprite.play('fighter_run', true);
      } else {
        this.sprite.setTexture('fighter_idle');
        this.sprite.play('fighter_idle', true);
      }
      this.sprite.y = box.y + 15;
      return;
    }
    if (box && (box.isJumping || box.isJumpingDiagonal)) {
      if (this.sprite.anims.animationManager.exists('fighter_jump')) {
        this.sprite.setTexture('fighter_jump');
        this.sprite.setOrigin(0, 1);
        this.sprite.setDisplaySize(67.5 * 1.5, 74 * 1.5);
        this.sprite.play('fighter_jump', true);
      } else {
        this.sprite.setTexture('fighter_idle');
        this.sprite.play('fighter_idle', true);
      }
      this.sprite.y = box.y + 15;
      return;
    }
    if (state.isPunching || state.isKicking) {
      if (this.sprite.anims.animationManager.exists('fighter_attack')) {
        this.sprite.setTexture('fighter_attack');
        this.sprite.setOrigin(0, 1);
        this.sprite.setDisplaySize(67.5 * 1.5, 74 * 1.5);
        this.sprite.play('fighter_attack', true);
      } else {
        this.sprite.setTexture('fighter_idle');
        this.sprite.play('fighter_idle', true);
      }
      this.sprite.y = box.y + 15;
      return;
    }
    if (inputState.down) {
      this.sprite.setOrigin(0, 1);
      this.sprite.setTexture('fighter_crouch');
      this.sprite.setScale(1, 1); // Reset scale first
      this.sprite.setScale(2.5, 2.5); // Make crouch much larger
      this.sprite.play('fighter_crouch', true);
      this.sprite.y = box.y + 15;
      return;
    }
  }
}
