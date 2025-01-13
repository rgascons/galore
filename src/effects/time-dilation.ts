import Phaser from "phaser";
import { EffectBase } from "./base";

export class TimeDilationEffect extends EffectBase {
  private scene: Phaser.Scene;
  private overlay?: Phaser.GameObjects.Container;
  private isEffectActive?: boolean;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
  }

  public activate(): void {
    const camera = this.scene.cameras.main;

    // Create a container for all effect elements
    this.overlay = this.scene.add.container(camera.x, camera.y);
    this.overlay.setDepth(9);
    this.overlay.setScrollFactor(0);

    // Base tint - slightly transparent
    const baseTint = this.scene.add.rectangle(
      camera.x,
      camera.y,
      camera.width,
      camera.height,
      0x000066,
      0.1  // More transparent base
    )
      .setOrigin(0)
      .setScrollFactor(0);

    // Create thinner border rectangles with rounded corners
    const borderWidth = 4; // Thinner borders
    const cornerRadius = 20; // Rounded corners
    const borderAlpha = 0.2; // More transparent borders

    // Top border with rounded corners
    const topBorder = this.scene.add.graphics()
      .setScrollFactor(0);
    topBorder.fillStyle(0x000066, borderAlpha);
    topBorder.fillRoundedRect(
      camera.x + borderWidth,
      camera.y + borderWidth,
      camera.width - borderWidth * 2,
      borderWidth * 2,
      cornerRadius
    );

    // Bottom border with rounded corners
    const bottomBorder = this.scene.add.graphics()
      .setScrollFactor(0);
    bottomBorder.fillStyle(0x000066, borderAlpha);
    bottomBorder.fillRoundedRect(
      camera.x + borderWidth,
      camera.y + camera.height - borderWidth * 3,
      camera.width - borderWidth * 2,
      borderWidth * 2,
      cornerRadius
    );

    // Left border with rounded corners
    const leftBorder = this.scene.add.graphics()
      .setScrollFactor(0);
    leftBorder.fillStyle(0x000066, borderAlpha);
    leftBorder.fillRoundedRect(
      camera.x + borderWidth,
      camera.y + borderWidth,
      borderWidth * 2,
      camera.height - borderWidth * 2,
      cornerRadius
    );

    // Right border with rounded corners
    const rightBorder = this.scene.add.graphics()
      .setScrollFactor(0);
    rightBorder.fillStyle(0x000066, borderAlpha);
    rightBorder.fillRoundedRect(
      camera.x + camera.width - borderWidth * 3,
      camera.y + borderWidth,
      borderWidth * 2,
      camera.height - borderWidth * 2,
      cornerRadius
    );

    // Add everything to the container
    this.overlay.add([baseTint, topBorder, bottomBorder, leftBorder, rightBorder]);

    // Add subtle pulsing effect
    this.scene.tweens.add({
      targets: [topBorder, bottomBorder, leftBorder, rightBorder],
      alpha: 0.1, // Pulse to more transparent
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    // Fade in effect
    this.overlay.setAlpha(0);
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
    this.isEffectActive = true;
  }

  public deactivate(): void {
    if (this.overlay) {
      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          this.overlay?.destroy();
        }
      });
    }
    this.isEffectActive = false;
  }

  public isActive(): boolean {
    return !!this.isEffectActive;
  }
}