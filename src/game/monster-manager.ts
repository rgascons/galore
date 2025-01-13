import { AssetImagesKeys } from "../config/asset-config";

export class MonsterManager {
  private scene: Phaser.Scene;
  private monsters: Phaser.Physics.Arcade.Group;
  private bullets: Phaser.Physics.Arcade.Group;
  private spawnTimer: number = 0;

  private readonly MONSTER_SPEED = 150;
  private readonly BULLET_SPEED = 300;
  private readonly SPAWN_DELAY = 3000;
  private readonly SHOOT_DELAY = 1000;
  private readonly MONSTER_ROTATION_SPEED = 0.03;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.monsters = scene.physics.add.group({
      defaultKey: AssetImagesKeys.Monster,
      maxSize: 20,
      createCallback: (monster) => {
        const m = monster as Phaser.Physics.Arcade.Sprite;
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
    const monster = this.monsters.get(position.x, position.y) as Phaser.Physics.Arcade.Sprite;
    if (monster) {
      monster.setActive(true).setVisible(true);
      monster.setData('nextShootTime', this.scene.time.now + this.SHOOT_DELAY);
    }
  }

  public update(time: number, playerPos: Phaser.Math.Vector2, worldBounds: { width: number, height: number }): void {
    this.monsters.children.each((monster: Phaser.GameObjects.GameObject) => {
      const m = monster as Phaser.Physics.Arcade.Sprite;
      if (m.active) {
        this.updateMonster(m, time, playerPos);

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

  private updateMonster(monster: Phaser.Physics.Arcade.Sprite, time: number, playerPos: Phaser.Math.Vector2): void {
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

    const newVelocity = this.scene.physics.velocityFromRotation(
      monster.rotation - Math.PI / 2,
      this.MONSTER_SPEED
    );
    monster.setVelocity(newVelocity.x, newVelocity.y);

    if (time > monster.getData('nextShootTime')) {
      this.shoot(monster, playerPos);
      monster.setData('nextShootTime', time + this.SHOOT_DELAY);
    }
  }

  private shoot(monster: Phaser.Physics.Arcade.Sprite, targetPos: Phaser.Math.Vector2): void {
    const bullet = this.bullets.get(monster.x, monster.y) as Phaser.Physics.Arcade.Sprite;
    if (!bullet) return;

    bullet.setActive(true).setVisible(true);

    const angle = Phaser.Math.Angle.Between(
      monster.x, monster.y,
      targetPos.x, targetPos.y
    );

    this.scene.physics.velocityFromRotation(angle, this.BULLET_SPEED, bullet.body?.velocity);
    bullet.setRotation(angle + Math.PI / 2);
  }

  private isOutOfBounds(x: number, y: number, bounds: { width: number, height: number }): boolean {
    return (x < 0 || x > bounds.width || y < 0 || y > bounds.height);
  }
}