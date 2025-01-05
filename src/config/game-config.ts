import Phaser from 'phaser';
import MainScene from '../scenes/main-scene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-content',
  backgroundColor: '#28282B',
  scale: {
    width: 800,
    height: 600,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x:0, y: 0 },
      debug: true,
    },
  },
  scene: [MainScene],
};
