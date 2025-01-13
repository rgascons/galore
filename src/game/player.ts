import { AssetImagesKeys } from "../config/asset-config";
import { CharacterModifiers, ModifierType } from "./modifiers/character-modifiers";
import { MonsterManager } from "./monster-manager";

export class Player {
  private sprite: Phaser.Physics.Arcade.Sprite;
  private bullets: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private scene: Phaser.Scene;
  private modifiers: CharacterModifiers;
  private lastShootTime: number = 0;

  private readonly baseSpeed: number = 160;
  private readonly baseFireRate: number = 1000;
  private readonly baseHealth: number = 1;
  private readonly BULLET_SPEED = 400;

  constructor(scene: Phaser.Scene, x: number, y: number, modifiers: CharacterModifiers) {
    this.scene = scene;
    this.modifiers = modifiers;
    
    this.sprite = scene.physics.add.sprite(x, y, AssetImagesKeys.Player);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setScale(1);

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
  }
}