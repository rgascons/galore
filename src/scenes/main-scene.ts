import Phaser from 'phaser';
import { Assets } from '../config/asset-config';
import { StoreItem } from './store-scene';
import { Player } from '../game/player';
import { MonsterManager } from '../game/monster-manager';
import { TerrainGenerator } from '../game/terrain-generator';

type ArcadePhysicsCallback = Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;

export class MainScene extends Phaser.Scene {
  private player?: Player;
  private monsterManager?: MonsterManager;
  private terrainGenerator?: TerrainGenerator;
  private score: number = 0;
  private scoreText?: Phaser.GameObjects.Text;
  private lastTimePoint: number = 0;
  private monsterSpawnTimer: number = 0;
  private readonly SPAWN_DELAY = 3000;
  private readonly POINTS_PER_KILL = 100;
  private readonly POINTS_PER_SECOND = 10;
  private readonly TIME_POINT_INTERVAL = 1000;

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: { purchasedItems: StoreItem[] }) {
    this.data.set('gameSeed', `${Math.floor(Math.random() * 1000000)}`);
    this.monsterSpawnTimer = 0;
    this.score = 0;
    this.lastTimePoint = 0;
  }

  preload() {
    Object.entries(Assets.Images).forEach(([key, path]) => {
      this.load.image(key, path);
    });
  }

  create() {
    // Initialize terrain
    this.terrainGenerator = new TerrainGenerator(this);
    this.terrainGenerator.initialize();

    // Create player at world center
    const bounds = this.terrainGenerator.getWorldBounds();
    this.player = new Player(this, bounds.width / 2, bounds.height / 2);

    // Initialize monster manager
    this.monsterManager = new MonsterManager(this);

    // Setup camera
    this.cameras.main.startFollow(this.player.getSprite());
    this.cameras.main.setBounds(0, 0, bounds.width, bounds.height);

    // Setup collisions
    this.setupCollisions();

    // Setup score display
    this.setupScoreDisplay();
  }

  private setupCollisions() {
    if (!this.player || !this.monsterManager || !this.terrainGenerator) return;

    const playerSprite = this.player.getSprite();
    const walls = this.terrainGenerator.getWalls();
    const monsters = this.monsterManager.getMonsters();
    const monsterBullets = this.monsterManager.getBullets();
    const playerBullets = this.player.getBullets();

    // Wall collisions
    this.physics.add.collider(playerSprite, walls);
    this.physics.add.collider(monsters, walls);
    this.physics.add.collider(playerBullets, walls, this.handleBulletWallCollision as ArcadePhysicsCallback, undefined, this);
    this.physics.add.collider(monsterBullets, walls, this.handleBulletWallCollision as ArcadePhysicsCallback, undefined, this);

    // Monster collisions
    this.physics.add.overlap(playerSprite, monsters, this.handleMonsterCollision as ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(playerSprite, monsterBullets, this.handleBulletHit as ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(playerBullets, monsters, this.handlePlayerBulletHit as ArcadePhysicsCallback, undefined, this);
  }

  private setupScoreDisplay() {
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { blur: 2, stroke: true, fill: true }
    });
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(100);
  }

  private addPoints(points: number) {
    this.score += points;
    if (this.scoreText) {
      this.scoreText.setText(`SCORE: ${this.score}`);

      const floatingScore = this.add.text(
        this.scoreText.x + 200,
        this.scoreText.y,
        `+${points}`,
        {
          fontFamily: 'monospace',
          fontSize: '24px',
          color: '#00ff00'
        }
      ).setScrollFactor(0);

      this.tweens.add({
        targets: floatingScore,
        y: floatingScore.y - 30,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => floatingScore.destroy()
      });
    }
  }

  private handleBulletWallCollision(bullet: Phaser.GameObjects.GameObject) {
    (bullet as Phaser.Physics.Arcade.Sprite).destroy();
  }

  private handleMonsterCollision(_player: Phaser.GameObjects.GameObject, monster: Phaser.GameObjects.GameObject) {
    (monster as Phaser.Physics.Arcade.Sprite).destroy();
  }

  private handleBulletHit(_player: Phaser.GameObjects.GameObject, bullet: Phaser.GameObjects.GameObject) {
    (bullet as Phaser.Physics.Arcade.Sprite).destroy();
    this.scene.start('GameOverScene', { score: this.score });
  }

  private handlePlayerBulletHit(bullet: Phaser.GameObjects.GameObject, monster: Phaser.GameObjects.GameObject) {
    (bullet as Phaser.Physics.Arcade.Sprite).destroy();
    (monster as Phaser.Physics.Arcade.Sprite).destroy();
    this.addPoints(this.POINTS_PER_KILL);
  }

  update(time: number) {
    if (!this.player || !this.monsterManager || !this.terrainGenerator) return;

    // Update player
    this.player.update(this.monsterManager);

    // Handle monster spawning
    if (time > this.monsterSpawnTimer) {
      const playerPos = new Phaser.Math.Vector2(
        this.player.getSprite().x,
        this.player.getSprite().y
      );
      const spawnPos = this.terrainGenerator.getRandomSpawnPosition(playerPos);
      this.monsterManager.spawn(spawnPos);
      this.monsterSpawnTimer = time + this.SPAWN_DELAY;
    }

    // Update monsters
    const playerPos = new Phaser.Math.Vector2(
      this.player.getSprite().x,
      this.player.getSprite().y
    );
    this.monsterManager.update(time, playerPos, this.terrainGenerator.getWorldBounds());

    // Update score
    if (time > this.lastTimePoint + this.TIME_POINT_INTERVAL) {
      this.addPoints(this.POINTS_PER_SECOND);
      this.lastTimePoint = time;
    }
  }
}