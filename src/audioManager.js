// AudioManager for centralized audio control

export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.sounds = {};
  }

  preload() {
    this.scene.load.audio('punch', '/sounds/punch.mp3');
    this.scene.load.audio('kick', '/sounds/kick.mp3');
    this.scene.load.audio('background', '/sounds/background.mp3');
    this.scene.load.audio('death', '/sounds/death.mp3');
  }

  create() {
    this.sounds.punch = this.scene.sound.add('punch');
    this.sounds.kick = this.scene.sound.add('kick');
    this.sounds.background = this.scene.sound.add('background', { loop: true, volume: 0.5 });
    this.sounds.death = this.scene.sound.add('death');
  }

  play(soundName) {
    if (this.sounds[soundName]) {
      this.sounds[soundName].play();
    }
  }

  stop(soundName) {
    if (this.sounds[soundName]) {
      this.sounds[soundName].stop();
    }
  }

  setVolume(soundName, volume) {
    if (this.sounds[soundName]) {
      this.sounds[soundName].setVolume(volume);
    }
  }
}
