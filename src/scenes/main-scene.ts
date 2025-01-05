// src/scenes/MainScene.ts
import Phaser from 'phaser';
import { Assets } from '../config/asset-config';

export default class MainScene extends Phaser.Scene {
  private readonly MONSTER_SPEED = 150;
  private readonly BULLET_SPEED = 250;
  private readonly MONSTER_ROTATION_SPEED = 0.03;

  private player?: Phaser.Physics.Arcade.Sprite;
  private walls?: Phaser.Physics.Arcade.StaticGroup;
  private monsters?: Phaser.Physics.Arcade.Group;
  private monsterBullets?: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private shooter?: Phaser.GameObjects.Sprite;
  private monsterTimer: number = 0;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    Object.entries(Assets.Images).forEach(([key, path]) => {
      this.load.image(key, path);
    });
  }

  create() {
    // Create player
    this.player = this.physics.add.sprite(400, 300, 'Player');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1);

    // Create walls and shooter
    this.walls = this.physics.add.staticGroup();
    this.shooter = this.walls.create(200, 200, 'Wall') as Phaser.GameObjects.Sprite;
    this.walls.create(600, 400, 'Wall');

    // Create monster group
    this.monsters = this.physics.add.group({
      defaultKey: 'Monster',
      maxSize: 10,
      createCallback: (monster) => {
        const m = monster as Phaser.Physics.Arcade.Sprite;
        m.setOrigin(0.5, 0.5);
        m.setData('rotationSpeed', this.MONSTER_ROTATION_SPEED);
        m.setData('nextShootTime', 0);
      }
    });

    // Create bullets group for monsters
    this.monsterBullets = this.physics.add.group({
      defaultKey: 'Bullet',
      maxSize: 30, // Allow for multiple bullets from multiple monsters
      createCallback: (bullet) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        b.setOrigin(0.5, 0.5);
      }
    });

    // Add collisions
    if (this.player) {
      this.physics.add.collider(this.player, this.walls);
      this.physics.add.collider(
        this.player, 
        this.monsters, 
        this.handleMonsterHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );
      this.physics.add.collider(
        this.player,
        this.monsterBullets,
        this.handleBulletHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );
    }

    // Setup controls
    this.cursors = this.input.keyboard?.createCursorKeys();
  }

  private handleMonsterHit(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    monster: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ) {
    if (monster instanceof Phaser.Physics.Arcade.Sprite) {
      monster.destroy();
    }
    this.scene.restart();
  }

  private handleBulletHit(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    bullet: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ) {
    if (bullet instanceof Phaser.Physics.Arcade.Sprite) {
      bullet.destroy();
    }
    this.scene.restart();
  }

  private spawnMonster() {
    if (!this.shooter || !this.player || !this.monsters) return;

    const monster = this.monsters.get(this.shooter.x, this.shooter.y) as Phaser.Physics.Arcade.Sprite;
    
    if (monster) {
      monster.setActive(true);
      monster.setVisible(true);

      // Calculate initial angle between shooter and player
      const angle = Phaser.Math.Angle.Between(
        this.shooter.x, this.shooter.y,
        this.player.x, this.player.y
      );

      // Set initial monster velocity
      this.physics.velocityFromRotation(angle, this.MONSTER_SPEED, monster.body?.velocity);
      
      // Set initial rotation
      const angleInDegrees = Phaser.Math.RadToDeg(angle) + 90;
      monster.setAngle(angleInDegrees);
      
      // Set next shoot time
      monster.setData('nextShootTime', this.time.now + 2000);
    }
  }

  private monsterShoot(monster: Phaser.Physics.Arcade.Sprite) {
    if (!this.player || !this.monsterBullets) return;

    const bullet = this.monsterBullets.get(monster.x, monster.y) as Phaser.Physics.Arcade.Sprite;
    
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setScale(0.5); // Make bullets smaller than monsters

      // Calculate angle between monster and player
      const angle = Phaser.Math.Angle.Between(
        monster.x, monster.y,
        this.player.x, this.player.y
      );

      // Set bullet velocity
      this.physics.velocityFromRotation(angle, this.BULLET_SPEED, bullet.body?.velocity);
      
      // Set bullet rotation
      const angleInDegrees = Phaser.Math.RadToDeg(angle) + 90;
      bullet.setAngle(angleInDegrees);
    }
  }

  private updateMonster(monster: Phaser.Physics.Arcade.Sprite) {
    if (!this.player) return;

    // Calculate the current angle between monster and player
    const targetAngle = Phaser.Math.Angle.Between(
      monster.x, monster.y,
      this.player.x, this.player.y
    );

    // Get the current velocity angle of the monster
    const currentAngle = Phaser.Math.Angle.Normalize(Phaser.Math.DegToRad(monster.angle - 90));

    // Calculate the shortest rotation direction
    let rotationDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);

    // Apply rotation based on the shortest direction
    const rotationSpeed = monster.getData('rotationSpeed');
    if (Math.abs(rotationDiff) > 0.1) {
      if (rotationDiff > 0) {
        monster.setRotation(monster.rotation + rotationSpeed);
      } else {
        monster.setRotation(monster.rotation - rotationSpeed);
      }
    }

    // Update velocity based on new rotation
    const newVelocity = this.physics.velocityFromRotation(
      monster.rotation - Math.PI/2,
      this.MONSTER_SPEED
    );
    monster.setVelocity(newVelocity.x, newVelocity.y);

    // Check if it's time to shoot
    const nextShootTime = monster.getData('nextShootTime');
    if (this.time.now >= nextShootTime) {
      this.monsterShoot(monster);
      monster.setData('nextShootTime', this.time.now + 2000); // Set next shoot time to 2 seconds from now
    }
  }

  update(time: number, delta: number) {
    if (!this.player || !this.cursors) return;

    const speed = 160;

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    // Vertical movement
    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
    } else {
      this.player.setVelocityY(0);
    }

    // Spawn monster every 5 seconds
    if (time > this.monsterTimer) {
      this.spawnMonster();
      this.monsterTimer = time + 5000;
    }

    // Update each monster's direction and shooting
    if (this.monsters) {
      this.monsters.children.each((monster: Phaser.GameObjects.GameObject) => {
        const m = monster as Phaser.Physics.Arcade.Sprite;
        if (m.active) {
          this.updateMonster(m);
        }
        // Clean up monsters that are out of bounds
        if (m.x < 0 || m.x > 800 || m.y < 0 || m.y > 600) {
          m.destroy();
        }
        return null;
      });
    }

    // Clean up bullets that are out of bounds
    if (this.monsterBullets) {
      this.monsterBullets.children.each((bullet: Phaser.GameObjects.GameObject) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        if (b.x < 0 || b.x > 800 || b.y < 0 || b.y > 600) {
          b.destroy();
        }
        return null;
      });
    }
  }
}