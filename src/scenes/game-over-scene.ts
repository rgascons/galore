import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score: number }) {
    this.finalScore = data.score;
  }

  create() {
    const { width, height } = this.scale;

    // Create the YOU DIED text with blood-like effect
    const deathText = this.add.text(width / 2, height / 3, 'YOU DIED', {
      fontFamily: 'serif',
      fontSize: '80px',
      color: '#ff0000',
      stroke: '#660000',
      strokeThickness: 6,
      shadow: { blur: 10, stroke: true, fill: true }
    });
    deathText.setOrigin(0.5);

    // Add dripping blood effect
    this.tweens.add({
      targets: deathText,
      y: deathText.y + 10,
      duration: 2000,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1
    });

    // Create the score text
    const scoreText = this.add.text(width / 2, height / 2, `Final Score: ${this.finalScore}`, {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    scoreText.setOrigin(0.5);

    // Create the revive button
    const button = this.add.container(width / 2, height * 0.7);

    const buttonBg = this.add.rectangle(0, 0, 200, 60, 0x660000);
    const buttonText = this.add.text(0, 0, 'REVIVE', {
      fontFamily: 'serif',
      fontSize: '32px',
      color: '#ffffff'
    });
    buttonText.setOrigin(0.5);

    button.add([buttonBg, buttonText]);

    // Make button interactive
    buttonBg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        buttonBg.setFillStyle(0x880000);
      })
      .on('pointerout', () => {
        buttonBg.setFillStyle(0x660000);
      })
      .on('pointerdown', () => {
        buttonBg.setFillStyle(0x440000);
      })
      .on('pointerup', () => {
        this.scene.start('StoreScene', { startingMoney: this.finalScore });
      });
  }
}