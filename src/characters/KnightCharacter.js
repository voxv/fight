import Character from './Character.js';

const SPRITE_HEIGHT = 160;

export default class KnightCharacter extends Character {
  static preload(scene) {
    scene.load.spritesheet('knight_idle', '/animations/knight_idle.png', { frameWidth: 85, frameHeight: 86 });
    scene.load.spritesheet('knight_run', '/animations/knight_run2.png', { frameWidth: 86.5, frameHeight: 90 });
    scene.load.spritesheet('knight_jump', '/animations/knight_jump.png', { frameWidth: 85, frameHeight: 135 });
    scene.load.spritesheet('knight_crouch', '/animations/knight_crouch.png', { frameWidth: 85, frameHeight: 90 });
    scene.load.spritesheet('knight_attack', '/animations/knight_attack.png', { frameWidth: 128, frameHeight: 84 });
  }

  static createAnimations(scene) {
    scene.anims.create({ key: 'knight_idle', frames: scene.anims.generateFrameNumbers('knight_idle', { start: 0, end: 6 }), frameRate: 3, repeat: -1 });
    scene.anims.create({ key: 'knight_run', frames: scene.anims.generateFrameNumbers('knight_run', { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
    scene.anims.create({ key: 'knight_jump', frames: scene.anims.generateFrameNumbers('knight_jump', { start: 0, end: 7 }), frameRate: 7, repeat: -1 });
    scene.anims.create({ key: 'knight_crouch', frames: scene.anims.generateFrameNumbers('knight_crouch', { start: 0, end: 4 }), frameRate: 24, repeat: 0 });
    scene.anims.create({ key: 'knight_attack', frames: scene.anims.generateFrameNumbers('knight_attack', { start: 0, end: 2 }), frameRate: 1, repeat: 0 });
  }

  createSprite(x, y) {
    return super.createSprite(x, y, 'knight_idle', 0);
  }

  update(box, inputState, state) {
    if (box && box.y === 355 && !inputState.left && !inputState.right && !inputState.up && !inputState.down) {
      this.sprite.setTexture('knight_idle');
      this.sprite.setOrigin(0, 1);
      this.sprite.setDisplaySize(85, 86);
      this.sprite.play('knight_idle', true);
      this.sprite.y = box.y + (box.health <= 0 ? -20 : 30 - Math.round((SPRITE_HEIGHT - 86) / 2) + 10);
      return;
    }
    if ((inputState.left || inputState.right) && !inputState.up) {
      this.sprite.setTexture('knight_run');
      this.sprite.setOrigin(0, 1);
      this.sprite.setDisplaySize(86.5, 90);
      this.sprite.play('knight_run', true);
      this.sprite.y = box.y + (box.health <= 0 ? -20 : 30 - Math.round((SPRITE_HEIGHT - 90) / 2) + 10);
      return;
    }
    if (box && (box.isJumping || box.isJumpingDiagonal)) {
      this.sprite.setTexture('knight_jump');
      this.sprite.setOrigin(0, 1);
      this.sprite.setDisplaySize(85, 135);
      this.sprite.play('knight_jump', true);
      this.sprite.y = box.y + (box.health <= 0 ? -20 : 30 - Math.round((SPRITE_HEIGHT - 135) / 2) + 10);
      return;
    }
    if (state.isPunching || state.isKicking) {
      this.sprite.setTexture('knight_attack');
      this.sprite.setOrigin(0, 1);
      this.sprite.setDisplaySize(128, 84);
      this.sprite.play('knight_attack', true);
      this.sprite.y = box.y + (box.health <= 0 ? -20 : 30 - Math.round((SPRITE_HEIGHT - 84) / 2) + 10);
      return;
    }
    if (inputState.down) {
      this.sprite.setTexture('knight_crouch');
      this.sprite.setOrigin(0, 1);
      this.sprite.setDisplaySize(85, 90);
      this.sprite.play('knight_crouch', true);
      this.sprite.y = box.y + (box.health <= 0 ? -20 : 30 - Math.round((SPRITE_HEIGHT - 90) / 2) + 10);
      return;
    }
  }
}
