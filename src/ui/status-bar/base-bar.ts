import Phaser from "phaser";

export abstract class BaseBar {
  protected scene: Phaser.Scene;
  protected graphics: Phaser.GameObjects.Graphics;
  protected barWidth: number = 40;
  protected barHeight: number = 4;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
  }

  protected drawBar(x: number, y: number, progress: number, backgroundColor: number, foregroundColor: number): void {
    this.graphics.clear();

    // Position the bar
    const barX = x - this.barWidth / 2;
    const barY = y;

    // Draw background
    this.graphics.fillStyle(backgroundColor);
    this.graphics.fillRect(barX, barY, this.barWidth, this.barHeight);

    // Draw progress
    this.graphics.fillStyle(foregroundColor);
    this.graphics.fillRect(
      barX,
      barY,
      this.barWidth * progress,
      this.barHeight
    );
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}