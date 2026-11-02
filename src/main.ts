import Phaser from 'phaser';
import './style.css';
import { MenuScene } from './scenes/MenuScene';
import { Level1Scene } from './scenes/Level1Scene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 900,
  height: 650,
  parent: 'game',
  scene: [MenuScene, Level1Scene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
