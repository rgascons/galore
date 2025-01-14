import Phaser from 'phaser';
import { BaseBar } from './base-bar';

export class CooldownBar extends BaseBar {
  private lastShootTime: number = 0;

  constructor(scene: Phaser.Scene) {
    super(scene);
  }

  public update(x: number, y: number, fireRate: number): void {
    const timeSinceShot = this.scene.time.now - this.lastShootTime;
    const progress = Math.min(timeSinceShot / fireRate, 1);
    this.drawBar(x, y - 30, progress, 0x000066, 0x3333ff);
  }

  public onShoot(): void {
    this.lastShootTime = this.scene.time.now;
  }
}