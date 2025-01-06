// src/scenes/MainScene.ts
import Phaser from 'phaser';
import { Assets } from '../config/asset-config';

export default class MainScene extends Phaser.Scene {
  // Game constants
  private readonly MONSTER_SPAWN_DELAY = 3000;
  private readonly MONSTER_SHOOT_DELAY = 1000;
  private readonly MONSTER_SPEED = 150;
  private readonly BULLET_SPEED = 300;
  private readonly PLAYER_BULLET_SPEED = 400;
  private readonly MIN_SPAWN_DISTANCE = 200;
  private readonly MONSTER_ROTATION_SPEED = 0.03;
  private readonly MAX_WALLS = 20;
  private readonly WALL_SIZE = 16;
  private readonly MIN_WALL_SPACING = 100;

  // World constants
  private readonly WORLD_WIDTH = 2400;
  private readonly WORLD_HEIGHT = 1800;
  private readonly TILE_SIZE = 16;

  private player?: Phaser.Physics.Arcade.Sprite;
  private walls?: Phaser.Physics.Arcade.StaticGroup;
  private monsters?: Phaser.Physics.Arcade.Group;
  private monsterBullets?: Phaser.Physics.Arcade.Group;
  private playerBullets?: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private monsterSpawnTimer: number = NaN;
  private gameSeed: string = '';

  constructor() {
    super({ key: 'MainScene' });
  }

  init() {
    this.gameSeed = `${Math.floor(Math.random() * 1000000)}`;
    this.monsterSpawnTimer = 0;
  }

  preload() {
    Object.entries(Assets.Images).forEach(([key, path]) => {
      this.load.image(key, path);
    });
  }

  private createFloorPattern() {
    // Create a smaller render texture for our pattern
    const PATTERN_SIZE = 512; // This will repeat
    const patternKey = 'FloorPattern';
    const pattern = this.add.renderTexture(0, 0, PATTERN_SIZE, PATTERN_SIZE);
    
    // Use seeded RNG for consistent patterns
    const rng = new Phaser.Math.RandomDataGenerator([this.gameSeed]);
    
    // Calculate number of tiles in our pattern
    const tilesX = Math.ceil(PATTERN_SIZE / this.TILE_SIZE);
    const tilesY = Math.ceil(PATTERN_SIZE / this.TILE_SIZE);
    
    // Generate pattern
    for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
            const roll = rng.frac();
            const tileKey = roll < 0.9 ? 'FloorMain' : 'FloorRare';
            pattern.draw(tileKey, x * this.TILE_SIZE, y * this.TILE_SIZE);
        }
    }

    // Convert RenderTexture to a static texture
    pattern.snapshot((snap) => {
      if (this.textures.exists(patternKey)) {
          this.textures.remove(patternKey);
      }
      this.textures.addImage(patternKey, snap as HTMLImageElement);
      
      // Create the tileSprite after texture is ready
      const floor = this.add.tileSprite(
          this.WORLD_WIDTH / 2,
          this.WORLD_HEIGHT / 2,
          this.WORLD_WIDTH,
          this.WORLD_HEIGHT,
          patternKey
      );
      floor.setDepth(-1);
    });
  }
  private isPositionValid(x: number, y: number, existingPositions: { x: number, y: number }[]): boolean {
    // Check distance from center (player spawn point)
    const worldCenterX = this.WORLD_WIDTH / 2;
    const worldCenterY = this.WORLD_HEIGHT / 2;
    const distanceFromCenter = Phaser.Math.Distance.Between(x, y, worldCenterX, worldCenterY);
    if (distanceFromCenter < 150) return false;

    // Check distance from other walls
    for (const pos of existingPositions) {
      const distance = Phaser.Math.Distance.Between(x, y, pos.x, pos.y);
      if (distance < this.MIN_WALL_SPACING) return false;
    }

    // Check if position is too close to edges
    if (x < this.WALL_SIZE || x > this.WORLD_WIDTH - this.WALL_SIZE || 
        y < this.WALL_SIZE || y > this.WORLD_HEIGHT - this.WALL_SIZE) {
      return false;
    }

    return true;
  }

  private generateWalls(): { x: number, y: number }[] {
    const rng = new Phaser.Math.RandomDataGenerator([this.gameSeed]);
    const positions: { x: number, y: number }[] = [];
    const numWalls = rng.between(8, this.MAX_WALLS);
    
    let attempts = 0;
    const maxAttempts = 200; // Increased for larger world

    while (positions.length < numWalls && attempts < maxAttempts) {
      const x = rng.between(this.WALL_SIZE, this.WORLD_WIDTH - this.WALL_SIZE);
      const y = rng.between(this.WALL_SIZE, this.WORLD_HEIGHT - this.WALL_SIZE);

      if (this.isPositionValid(x, y, positions)) {
        positions.push({ x, y });
      }

      attempts++;
    }

    return positions;
  }

  create() {
    // Set world bounds
    this.physics.world.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

    // Create floor
    this.createFloorPattern();

    // Create player at the center of the world
    this.player = this.physics.add.sprite(
      this.WORLD_WIDTH / 2,
      this.WORLD_HEIGHT / 2,
      'Player'
    );
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1);

    // Setup camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

    // Create walls using seeded generation
    this.walls = this.physics.add.staticGroup();
    const wallPositions = this.generateWalls();
    
    wallPositions.forEach(pos => {
      this.walls?.create(pos.x, pos.y, 'Wall');
    });

    // Create monster group
    this.monsters = this.physics.add.group({
      defaultKey: 'Monster',
      maxSize: 20,
      createCallback: (monster) => {
        const m = monster as Phaser.Physics.Arcade.Sprite;
        m.setOrigin(0.5, 0.5);
        m.setData('rotationSpeed', this.MONSTER_ROTATION_SPEED);
        m.setData('nextShootTime', 0);
      }
    });

    // Create monster bullets group
    this.monsterBullets = this.physics.add.group({
      defaultKey: 'Bullet',
      maxSize: 50,
      createCallback: (bullet) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        b.setOrigin(0.5, 0.5);
        b.setScale(0.3); // Smaller bullets
      }
    });

    // Create player bullets group
    this.playerBullets = this.physics.add.group({
      defaultKey: 'Bullet',
      maxSize: 30,
      createCallback: (bullet) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        b.setOrigin(0.5, 0.5);
        b.setScale(0.4);
      }
    });

    // Setup collisions
    if (this.player) {
      // Wall collisions
      this.physics.add.collider(this.player, this.walls);
      this.physics.add.collider(this.monsters, this.walls);
      this.physics.add.collider(this.playerBullets, this.walls, this.handleBulletWallCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
      this.physics.add.collider(this.monsterBullets, this.walls, this.handleBulletWallCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
      
      // Player-Monster collision
      this.physics.add.overlap(
        this.player,
        this.monsters,
        this.handleMonsterCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );

      // Player-MonsterBullet collision
      this.physics.add.overlap(
        this.player,
        this.monsterBullets,
        this.handleBulletHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );

      // PlayerBullet-Monster collision
      this.physics.add.overlap(
        this.playerBullets,
        this.monsters,
        this.handlePlayerBulletHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );
    }

    // Setup controls
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private handleBulletWallCollision(
    bullet: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ) {
    if (bullet instanceof Phaser.Physics.Arcade.Sprite) {
      bullet.destroy();
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

    // Update velocity to move towards player
    const newVelocity = this.physics.velocityFromRotation(
      monster.rotation - Math.PI/2,
      this.MONSTER_SPEED
    );
    monster.setVelocity(newVelocity.x, newVelocity.y);
  }

  private getRandomSpawnPosition(): Phaser.Math.Vector2 {
    if (!this.player) return new Phaser.Math.Vector2(0, 0);

    let x: number, y: number, distance: number;
    do {
      x = Phaser.Math.Between(50, 750);
      y = Phaser.Math.Between(50, 550);
      distance = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
    } while (distance < this.MIN_SPAWN_DISTANCE);

    return new Phaser.Math.Vector2(x, y);
  }

  private findNearestMonster(): Phaser.Math.Vector2 | null {
    if (!this.player || !this.monsters) return null;

    let nearestDistance = Number.MAX_VALUE;
    let nearestPosition: Phaser.Math.Vector2 | null = null;

    this.monsters.children.each((monster: Phaser.GameObjects.GameObject) => {
      const m = monster as Phaser.Physics.Arcade.Sprite;
      if (m.active) {
        const distance = Phaser.Math.Distance.Between(
          this.player!.x, this.player!.y,
          m.x, m.y
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPosition = new Phaser.Math.Vector2(m.x, m.y);
        }
      }
      return null;
    });

    return nearestPosition;
  }

  private spawnMonster() {
    if (!this.monsters) return;

    const spawnPos = this.getRandomSpawnPosition();
    const monster = this.monsters.get(spawnPos.x, spawnPos.y) as Phaser.Physics.Arcade.Sprite;
    
    if (monster) {
      monster.setActive(true);
      monster.setVisible(true);
      monster.setData('nextShootTime', this.time.now + this.MONSTER_SHOOT_DELAY);
    }
  }

  private playerShoot() {
    if (!this.player || !this.playerBullets) return;

    const targetPos = this.findNearestMonster();
    if (!targetPos) return;

    const bullet = this.playerBullets.get(this.player.x, this.player.y) as Phaser.Physics.Arcade.Sprite;
    
    if (bullet) {
      bullet.setActive(true).setVisible(true);

      const angle = Phaser.Math.Angle.Between(
        this.player.x, this.player.y,
        targetPos.x, targetPos.y
      );

      this.physics.velocityFromRotation(angle, this.PLAYER_BULLET_SPEED, bullet.body?.velocity);
      bullet.setRotation(angle + Math.PI/2);
    }
  }

  private monsterShoot(monster: Phaser.Physics.Arcade.Sprite) {
    if (!this.player || !this.monsterBullets) return;

    const bullet = this.monsterBullets.get(monster.x, monster.y) as Phaser.Physics.Arcade.Sprite;
    
    if (bullet) {
      bullet.setActive(true).setVisible(true);

      const angle = Phaser.Math.Angle.Between(
        monster.x, monster.y,
        this.player.x, this.player.y
      );

      this.physics.velocityFromRotation(angle, this.BULLET_SPEED, bullet.body?.velocity);
      bullet.setRotation(angle + Math.PI/2);
    }
  }

  private handleMonsterCollision(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    monster: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ) {
    if (monster instanceof Phaser.Physics.Arcade.Sprite) {
      monster.destroy();
    }
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

  private handlePlayerBulletHit(
    bullet: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    monster: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ) {
    if (bullet instanceof Phaser.Physics.Arcade.Sprite) {
      bullet.destroy();
    }
    if (monster instanceof Phaser.Physics.Arcade.Sprite) {
      monster.destroy();
    }
  }

  update(time: number) {
    if (!this.player || !this.cursors) return;

    const speed = 160;

    // Player movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
    } else {
      this.player.setVelocityY(0);
    }

    // Player shooting
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey!)) {
      this.playerShoot();
    }

    // Monster spawning
    if (time > this.monsterSpawnTimer) {
      this.spawnMonster();
      this.monsterSpawnTimer = time + this.MONSTER_SPAWN_DELAY;
    }

    // Update monsters
    if (this.monsters) {
      this.monsters.children.each((monster: Phaser.GameObjects.GameObject) => {
        const m = monster as Phaser.Physics.Arcade.Sprite;
        if (m.active) {
          // Update monster movement
          this.updateMonster(m);

          // Clean up monsters that are out of bounds
          if (this.isOutOfBounds(m.x, m.y)) {
            m.destroy();
          }
          
          // Monster shooting
          if (time > m.getData('nextShootTime')) {
            this.monsterShoot(m);
            m.setData('nextShootTime', time + this.MONSTER_SHOOT_DELAY);
          }
        }
        return null;
      });
    }

    // Clean up bullets that are out of bounds
    [this.monsterBullets, this.playerBullets].forEach(bulletGroup => {
      if (bulletGroup) {
        bulletGroup.children.each((bullet: Phaser.GameObjects.GameObject) => {
          const b = bullet as Phaser.Physics.Arcade.Sprite;
          if (this.isOutOfBounds(b.x, b.y)) {
            b.destroy();
          }
          return null;
        });
      }
    });
  }

  private isOutOfBounds(x: number, y: number): boolean {
    return (x < 0 || x > this.WORLD_WIDTH || y < 0 || y > this.WORLD_HEIGHT);
  }
}