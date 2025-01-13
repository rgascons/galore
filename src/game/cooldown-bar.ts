import { CharacterModifiers } from './modifiers/character-modifiers';

export class CooldownBar {
  private scene: Phaser.Scene;
  private barWidth: number = 40;
  private barHeight: number = 4;
  private graphics: Phaser.GameObjects.Graphics;
  private lastShootTime: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
  }

  public update(x: number, y: number, fireRate: number): void {
    this.graphics.clear();

    // Position the bar above the player
    const barX = x - this.barWidth / 2;
    const barY = y - 30; // Offset above player

    // Calculate progress based on time since last shot
    const timeSinceShot = this.scene.time.now - this.lastShootTime;
    const progress = Math.min(timeSinceShot / fireRate, 1);

    // Draw background (darker blue)
    this.graphics.fillStyle(0x000066);
    this.graphics.fillRect(barX, barY, this.barWidth, this.barHeight);

    // Draw progress (lighter blue)
    this.graphics.fillStyle(0x3333ff);
    this.graphics.fillRect(
      barX,
      barY,
      this.barWidth * progress,
      this.barHeight
    );
  }

  public onShoot(): void {
    this.lastShootTime = this.scene.time.now;
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}