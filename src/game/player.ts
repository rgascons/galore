import { AssetImagesKeys } from "../config/asset-config";
import { MonsterManager } from "./monster-manager";
import { CharacterModifiers, ModifierType } from "./modifiers/character-modifiers";

export class Player {
  private sprite: Phaser.Physics.Arcade.Sprite;
  private bullets: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private scene: Phaser.Scene;
  private modifiers: CharacterModifiers;
  private lastShootTime: number = 0;
  private shieldGraphics?: Phaser.GameObjects.Graphics;
  private shieldAngle: number = 0;

  private readonly baseSpeed: number = 160;
  private readonly baseFireRate: number = 1000;
  private readonly baseHealth: number = 1;
  private readonly BULLET_SPEED = 400;
  private readonly SHIELD_RADIUS = 15;
  private readonly SHIELD_ROTATION_SPEED = 0.02;

  constructor(scene: Phaser.Scene, x: number, y: number, modifiers: CharacterModifiers) {
    this.scene = scene;
    this.modifiers = modifiers;

    this.sprite = scene.physics.add.sprite(x, y, AssetImagesKeys.Player);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setScale(1);

    // Create shield graphics
    this.shieldGraphics = scene.add.graphics();
    this.updateShieldEffect();

    this.cursors = scene.input.keyboard?.createCursorKeys();
    this.spaceKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.bullets = scene.physics.add.group({
      defaultKey: AssetImagesKeys.Bullet,
      maxSize: 30,
      createCallback: (bullet) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        b.setOrigin(0.5, 0.5);
        b.setScale(0.4);
      }
    });
  }

  private getSpeed(): number {
    const speedModifier = this.modifiers.getModifierValue(ModifierType.Speed);
    return this.baseSpeed * (1 + speedModifier);
  }

  private getFireRate(): number {
    const fireRateModifier = this.modifiers.getModifierValue(ModifierType.FireRate);
    return this.baseFireRate * (1 - fireRateModifier);
  }

  public getHealth(): number {
    const healthModifier = this.modifiers.getModifierValue(ModifierType.Health);
    return this.baseHealth + healthModifier;
  }

  public getScoreMultiplier(): number {
    const multiplierModifier = this.modifiers.getModifierValue(ModifierType.ScoreMultiplier);
    return 1 + multiplierModifier; // Base multiplier is 1
  }

  public hasShield(): boolean {
    return this.modifiers.getModifierValue(ModifierType.Health) > 0;
  }

  public removeShield(): void {
    this.modifiers.clearModifiers(ModifierType.Health);
  }

  public getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }

  public getBullets(): Phaser.Physics.Arcade.Group {
    return this.bullets;
  }

  public shoot(targetPos: Phaser.Math.Vector2): void {
    const bullet = this.bullets.get(this.sprite.x, this.sprite.y) as Phaser.Physics.Arcade.Sprite;
    if (!bullet) return;

    bullet.setActive(true).setVisible(true);
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      targetPos.x, targetPos.y
    );

    this.scene.physics.velocityFromRotation(angle, this.BULLET_SPEED, bullet.body?.velocity);
    bullet.setRotation(angle + Math.PI / 2);
  }

  public update(monsterManager: MonsterManager): void {
    if (!this.sprite.active) return;
    if (!this.cursors || !this.spaceKey) return;

    const speed = this.getSpeed();

    if (this.cursors.left.isDown) {
      this.sprite.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.sprite.setVelocityX(speed);
    } else {
      this.sprite.setVelocityX(0);
    }

    if (this.cursors.up.isDown) {
      this.sprite.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.sprite.setVelocityY(speed);
    } else {
      this.sprite.setVelocityY(0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      const currentTime = this.scene.time.now;
      if (currentTime - this.lastShootTime >= this.getFireRate()) {
        this.lastShootTime = currentTime;
        const target = monsterManager.findNearest(this.sprite.x, this.sprite.y);
        if (target) {
          this.shoot(target);
        }
      }
    }

    // Update shield effect
    this.updateShieldEffect();
  }

  private updateShieldEffect(): void {
    if (!this.shieldGraphics) return;

    this.shieldGraphics.clear();

    if (this.hasShield()) {
      // Update shield rotation
      this.shieldAngle += this.SHIELD_ROTATION_SPEED;
      
      // Draw shield effect
      this.shieldGraphics.lineStyle(2, 0x00ffff, 0.8);
      
      // Create a hexagonal shield with rotation
      const points: { x: number, y: number }[] = [];
      const segments = 6;
      
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + this.shieldAngle;
        points.push({
          x: this.sprite.x + Math.cos(angle) * this.SHIELD_RADIUS,
          y: this.sprite.y + Math.sin(angle) * this.SHIELD_RADIUS
        });
      }

      // Draw the main shield shape
      this.shieldGraphics.beginPath();
      this.shieldGraphics.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i <= segments; i++) {
        this.shieldGraphics.lineTo(points[i].x, points[i].y);
      }
      
      this.shieldGraphics.strokePath();

      // Add glow effect
      this.shieldGraphics.lineStyle(4, 0x00ffff, 0.2);
      this.shieldGraphics.beginPath();
      this.shieldGraphics.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i <= segments; i++) {
        this.shieldGraphics.lineTo(points[i].x, points[i].y);
      }
      
      this.shieldGraphics.strokePath();
    }
  }

  public destroy(): void {
    if (this.shieldGraphics) {
      this.shieldGraphics.destroy();
    }
    this.sprite.destroy();
  }
}