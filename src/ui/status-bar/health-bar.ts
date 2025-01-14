import Phaser from 'phaser';
import { BaseBar } from './base-bar';

export class HealthBar extends BaseBar {
  constructor(scene: Phaser.Scene) {
    super(scene);
    this.barWidth = 50; // Make health bar slightly wider
  }

  public update(x: number, y: number, currentHealth: number, maxHealth: number): void {
    const progress = Math.max(0, currentHealth / maxHealth);
    // Position slightly higher than cooldown bar
    this.drawBar(x, y - 35, progress, 0x660000, 0xff0000);
  }
}