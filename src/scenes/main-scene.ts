// src/scenes/MainScene.ts
import Phaser from 'phaser';
import { Assets } from '../config/asset-config';

export default class MainScene extends Phaser.Scene {
  private readonly BULLET_SPEED = 200;
  private readonly BULLET_ROTATION_SPEED = 0.03; // Adjust this to make bullets turn faster/slower

  private player?: Phaser.Physics.Arcade.Sprite;
  private walls?: Phaser.Physics.Arcade.StaticGroup;
  private bullets?: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private shooter?: Phaser.GameObjects.Sprite;
  private bulletTimer: number = 0;

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
    this.player.setScale(0.5);

    // Create walls and shooter
    this.walls = this.physics.add.staticGroup();
    this.shooter = this.walls.create(200, 200, 'Wall') as Phaser.GameObjects.Sprite;
    this.walls.create(600, 400, 'Wall');

    // Create bullet group
    this.bullets = this.physics.add.group({
      defaultKey: 'Bullet',
      maxSize: 10,
      createCallback: (bullet) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        b.setOrigin(0.5, 0.5);
        // Store the bullet's current rotation speed
        b.setData('rotationSpeed', this.BULLET_ROTATION_SPEED);
      }
    });

    // Add collisions
    if (this.player) {
      this.physics.add.collider(this.player, this.walls);
      this.physics.add.collider(
        this.player, 
        this.bullets, 
        this.handleBulletHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );
    }

    // Setup controls
    this.cursors = this.input.keyboard?.createCursorKeys();
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

  private shootBullet() {
    if (!this.shooter || !this.player || !this.bullets) return;

    const bullet = this.bullets.get(this.shooter.x, this.shooter.y) as Phaser.Physics.Arcade.Sprite;
    
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);

      // Calculate initial angle between shooter and player
      const angle = Phaser.Math.Angle.Between(
        this.shooter.x, this.shooter.y,
        this.player.x, this.player.y
      );

      // Set initial bullet velocity
      this.physics.velocityFromRotation(angle, this.BULLET_SPEED, bullet.body?.velocity);
      
      // Set initial rotation
      const angleInDegrees = Phaser.Math.RadToDeg(angle) + 90;
      bullet.setAngle(angleInDegrees);
    }
  }

  private updateBullet(bullet: Phaser.Physics.Arcade.Sprite) {
    if (!this.player) return;

    // Calculate the current angle between bullet and player
    const targetAngle = Phaser.Math.Angle.Between(
      bullet.x, bullet.y,
      this.player.x, this.player.y
    );

    // Get the current velocity angle of the bullet
    const currentAngle = Phaser.Math.Angle.Normalize(Phaser.Math.DegToRad(bullet.angle - 90));

    // Calculate the shortest rotation direction
    let rotationDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);

    // Apply rotation based on the shortest direction
    const rotationSpeed = bullet.getData('rotationSpeed');
    if (Math.abs(rotationDiff) > 0.1) { // Only rotate if the difference is significant
      if (rotationDiff > 0) {
        bullet.setRotation(bullet.rotation + rotationSpeed);
      } else {
        bullet.setRotation(bullet.rotation - rotationSpeed);
      }
    }

    // Update velocity based on new rotation
    const newVelocity = this.physics.velocityFromRotation(
      bullet.rotation - Math.PI/2, // Subtract 90 degrees because of sprite orientation
      this.BULLET_SPEED
    );
    bullet.setVelocity(newVelocity.x, newVelocity.y);
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

    // Shoot bullet every 5 seconds
    if (time > this.bulletTimer) {
      this.shootBullet();
      this.bulletTimer = time + 5000;
    }

    // Update each bullet's direction
    if (this.bullets) {
      this.bullets.children.each((bullet: Phaser.GameObjects.GameObject) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        if (b.active) {
          this.updateBullet(b);
        }
        // Clean up bullets that are out of bounds
        if (b.x < 0 || b.x > 800 || b.y < 0 || b.y > 600) {
          b.destroy();
        }
        return null;
      });
    }
  }
}