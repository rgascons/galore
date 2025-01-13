import Phaser from "phaser";
import { AssetImagesKeys } from "../config/asset-config";

enum MonsterType {
  Normal = 'normal',
  Heavy = 'heavy',
}

type MonsterModifiers = {
  MonsterSpeedMultiplier: number;
  BulletSpeedMultiplier: number;
}

interface Monster extends Phaser.Physics.Arcade.Sprite {
  monsterType: MonsterType;
}

export class MonsterManager {
  private scene: Phaser.Scene;
  private monsters: Phaser.Physics.Arcade.Group;
  private bullets: Phaser.Physics.Arcade.Group;
  private spawnTimer: number = 0;

  private readonly NORMAL_MONSTER_SPEED = 150;
  private readonly HEAVY_MONSTER_SPEED = 100;
  private readonly BULLET_SPEED = 300;
  private readonly SPAWN_DELAY = 3000;
  private readonly NORMAL_SHOOT_DELAY = 1000;
  private readonly HEAVY_SHOOT_DELAY = 2000;
  private readonly MONSTER_ROTATION_SPEED = 0.03;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.monsters = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 20,
      createCallback: (monster) => {
        const m = monster as Monster;
        m.setOrigin(0.5, 0.5);
        m.setData('rotationSpeed', this.MONSTER_ROTATION_SPEED);
        m.setData('nextShootTime', 0);
      }
    });

    this.bullets = scene.physics.add.group({
      defaultKey: AssetImagesKeys.Bullet,
      maxSize: 50,
      createCallback: (bullet) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        b.setOrigin(0.5, 0.5);
        b.setScale(0.3);
      }
    });
  }

  public getMonsters(): Phaser.Physics.Arcade.Group {
    return this.monsters;
  }

  public getBullets(): Phaser.Physics.Arcade.Group {
    return this.bullets;
  }

  public findNearest(x: number, y: number): Phaser.Math.Vector2 | null {
    let nearestDistance = Number.MAX_VALUE;
    let nearestPosition: Phaser.Math.Vector2 | null = null;

    this.monsters.children.each((monster: Phaser.GameObjects.GameObject) => {
      const m = monster as Phaser.Physics.Arcade.Sprite;
      if (m.active) {
        const distance = Phaser.Math.Distance.Between(x, y, m.x, m.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPosition = new Phaser.Math.Vector2(m.x, m.y);
        }
      }
      return null;
    });

    return nearestPosition;
  }

  public spawn(position: Phaser.Math.Vector2): void {
    // Randomly choose monster type (30% chance for heavy monster)
    const monsterType = Math.random() < 0.3 ? MonsterType.Heavy : MonsterType.Normal;
    const textureKey = monsterType === MonsterType.Normal ?
      AssetImagesKeys.Monster :
      AssetImagesKeys.HeavyMonster;

    const monster = this.monsters.create(position.x, position.y, textureKey) as Monster;
    if (monster) {
      monster.monsterType = monsterType;
      monster.setActive(true).setVisible(true);
      monster.setData('nextShootTime', this.scene.time.now +
        (monsterType === MonsterType.Normal ? this.NORMAL_SHOOT_DELAY : this.HEAVY_SHOOT_DELAY));

      // Set size based on type
      if (monsterType === MonsterType.Heavy) {
        monster.setScale(1.5);
      }
    }
  }

  public update(
    time: number,
    playerPos: Phaser.Math.Vector2,
    worldBounds: { width: number, height: number },
    monsterModifiers: MonsterModifiers,
  ): void {
    this.monsters.children.each((monster: Phaser.GameObjects.GameObject) => {
      const m = monster as Phaser.Physics.Arcade.Sprite;
      if (m.active) {
        this.updateMonster(m as Monster, time, playerPos, monsterModifiers);

        if (this.isOutOfBounds(m.x, m.y, worldBounds)) {
          m.destroy();
        }
      }
      return null;
    });

    this.bullets.children.each((bullet: Phaser.GameObjects.GameObject) => {
      const b = bullet as Phaser.Physics.Arcade.Sprite;
      if (this.isOutOfBounds(b.x, b.y, worldBounds)) {
        b.destroy();
      }
      return null;
    });
  }

  private updateMonster(monster: Monster, time: number, playerPos: Phaser.Math.Vector2, monsterModifiers: MonsterModifiers): void {
    const targetAngle = Phaser.Math.Angle.Between(
      monster.x, monster.y,
      playerPos.x, playerPos.y
    );

    const currentAngle = Phaser.Math.Angle.Normalize(Phaser.Math.DegToRad(monster.angle - 90));
    const rotationDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);

    if (Math.abs(rotationDiff) > 0.1) {
      const rotationSpeed = monster.getData('rotationSpeed');
      monster.setRotation(monster.rotation + (rotationDiff > 0 ? rotationSpeed : -rotationSpeed));
    }

    const speed = monster.monsterType === MonsterType.Normal ? 
      this.NORMAL_MONSTER_SPEED : 
      this.HEAVY_MONSTER_SPEED;

    const newVelocity = this.scene.physics.velocityFromRotation(
      monster.rotation - Math.PI / 2,
      speed * monsterModifiers.MonsterSpeedMultiplier
    );
    monster.setVelocity(newVelocity.x, newVelocity.y);

    if (time > monster.getData('nextShootTime')) {
      this.shoot(monster, playerPos, monsterModifiers);
      monster.setData('nextShootTime', time + 
        (monster.monsterType === MonsterType.Normal ? 
          this.NORMAL_SHOOT_DELAY : 
          this.HEAVY_SHOOT_DELAY));
    }
  }

  private shoot(monster: Monster, targetPos: Phaser.Math.Vector2, monsterModifiers: MonsterModifiers): void {
    if (monster.monsterType === MonsterType.Normal) {
      this.shootSingle(monster, targetPos, monsterModifiers);
    } else {
      this.shootTriple(monster, targetPos, monsterModifiers);
    }
  }

  private shootSingle(monster: Monster, targetPos: Phaser.Math.Vector2, monsterModifiers: MonsterModifiers): void {
    const bullet = this.bullets.get(monster.x, monster.y) as Phaser.Physics.Arcade.Sprite;
    if (!bullet) return;

    bullet.setActive(true).setVisible(true);
    const angle = Phaser.Math.Angle.Between(
      monster.x, monster.y,
      targetPos.x, targetPos.y
    );

    this.scene.physics.velocityFromRotation(angle, this.BULLET_SPEED * monsterModifiers.BulletSpeedMultiplier, bullet.body?.velocity);
    bullet.setRotation(angle + Math.PI / 2);
  }

  private shootTriple(monster: Monster, targetPos: Phaser.Math.Vector2, monsterModifiers: MonsterModifiers): void {
    const baseAngle = Phaser.Math.Angle.Between(
      monster.x, monster.y,
      targetPos.x, targetPos.y
    );

    // Create three bullets in a fan pattern (-15°, 0°, +15° spread)
    [-0.26, 0, 0.26].forEach(angleOffset => {
      const bullet = this.bullets.get(monster.x, monster.y) as Phaser.Physics.Arcade.Sprite;
      if (!bullet) return;

      bullet.setActive(true).setVisible(true);
      const angle = baseAngle + angleOffset;
      this.scene.physics.velocityFromRotation(angle, this.BULLET_SPEED * monsterModifiers.BulletSpeedMultiplier, bullet.body?.velocity);
      bullet.setRotation(angle + Math.PI / 2);
    });
  }

  private isOutOfBounds(x: number, y: number, bounds: { width: number, height: number }): boolean {
    return (x < 0 || x > bounds.width || y < 0 || y > bounds.height);
  }
}