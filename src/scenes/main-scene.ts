import Phaser from 'phaser';
import { Assets, AssetSoundKeys } from '../config/asset-config';
import { StoreItem } from './store-scene';
import { Player } from '../game/player';
import { MonsterManager } from '../game/monster-manager';
import { TerrainGenerator } from '../game/terrain-generator';
import { CharacterModifiers } from '../game/modifiers/character-modifiers';
import { AbilityButton } from '../ui/ability-button';
import { TimeDilationEffect } from '../effects/time-dilation';

type ArcadePhysicsCallback = Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;

export class MainScene extends Phaser.Scene {
  private player?: Player;
  private monsterManager?: MonsterManager;
  private terrainGenerator?: TerrainGenerator;
  private score: number = 0;
  private scoreText?: Phaser.GameObjects.Text;
  private lastTimePoint: number = 0;
  private monsterSpawnTimer: number = 0;
  private purchasedItems: StoreItem[] = [];
  private characterModifiers: CharacterModifiers = new CharacterModifiers();
  private ghostFormButton?: AbilityButton;
  private timeDilationButton?: AbilityButton;
  private timeDilationEffect?: TimeDilationEffect;

  private shootSound?: Phaser.Sound.BaseSound;
  private deathSound?: Phaser.Sound.BaseSound;
  private timeDilationSound?: Phaser.Sound.BaseSound;
  private ghostSound?: Phaser.Sound.BaseSound;

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
    this.purchasedItems = data.purchasedItems;
  }

  preload() {
    Object.entries(Assets.Images).forEach(([key, path]) => {
      this.load.image(key, path);
    });

    Object.entries(Assets.Sounds).forEach(([key, path]) => {
      this.load.audio(key, path);
    });

    // Load particle texture
    this.load.image('white-circle', 'assets/white-circle.svg');
  }

  create() {
    // Initialize modifiers and apply store items
    this.characterModifiers = new CharacterModifiers();
    this.purchasedItems.forEach(item => {
      this.characterModifiers?.applyStoreItem(item);
    });

    // Initialize terrain
    this.terrainGenerator = new TerrainGenerator(this);
    this.terrainGenerator.initialize();

    // Create player at world center
    const bounds = this.terrainGenerator.getWorldBounds();
    this.player = new Player(
      this,
      bounds.width / 2,
      bounds.height / 2,
      this.characterModifiers
    );

    // Initialize monster manager
    this.monsterManager = new MonsterManager(this);

    // Setup camera
    this.cameras.main.startFollow(this.player.getSprite());
    this.cameras.main.setBounds(0, 0, bounds.width, bounds.height);

    // Setup collisions
    this.setupCollisions();

    // Setup score display
    this.setupScoreDisplay();

    // Create ability buttons if abilities were purchased
    this.createAbilityButtons();

    // Initialize time dilation effect
    this.timeDilationEffect = new TimeDilationEffect(this);

    // Initialize sounds
    this.shootSound = this.sound.add(AssetSoundKeys.Shoot);
    this.deathSound = this.sound.add(AssetSoundKeys.Death);
    this.timeDilationSound = this.sound.add(AssetSoundKeys.TimeDilation);
    this.ghostSound = this.sound.add(AssetSoundKeys.Ghost);
  }

  private createAbilityButtons(): void {
    const hasGhostForm = this.purchasedItems?.some(item => item.id === 'ghost_form');
    const hasTimeDilation = this.purchasedItems?.some(item => item.id === 'time_dilation');

    let buttonX = 80; // Starting X position for buttons

    if (hasGhostForm) {
      this.ghostFormButton = new AbilityButton(
        this,
        buttonX,
        this.scale.height - 80,
        {
          key: 'G',
          duration: 15000, // 15 seconds
          icon: '👻'
        },
        () => this.activateGhostForm(),
        () => this.deactivateGhostForm()
      );
      buttonX += 70; // Space for next button
    }

    if (hasTimeDilation) {
      console.log('time dilation')
      this.timeDilationButton = new AbilityButton(
        this,
        buttonX,
        this.scale.height - 80,
        {
          key: 'T',
          duration: 10000, // 10 seconds
          icon: '⌛'
        },
        () => this.activateTimeDilation(),
        () => this.deactivateTimeDilation()
      );
    }
  }

  private activateGhostForm(): void {
    if (!this.player) return;

    // Play ghost form sound
    this.ghostSound?.play();

    // Make player semi-transparent
    this.player.getSprite().setAlpha(0.5);

    // Disable collisions with walls
    this.physics.world.colliders.getActive()
      .filter(collider =>
        collider.object1 === this.player?.getSprite() &&
        collider.object2 === this.terrainGenerator?.getWalls()
      )
      .forEach(collider => collider.active = false);
  }

  private deactivateGhostForm(): void {
    if (!this.player) return;

    // Restore player opacity
    this.player.getSprite().setAlpha(1);

    // Re-enable collisions with walls
    this.physics.world.colliders.getActive()
      .filter(collider =>
        collider.object1 === this.player?.getSprite() &&
        collider.object2 === this.terrainGenerator?.getWalls()
      )
      .forEach(collider => collider.active = true);
  }

  private activateTimeDilation(): void {
    if (!this.monsterManager || !this.timeDilationEffect) return;

    // Play time dilation sound
    this.timeDilationSound?.play();

    // Activate visual effect
    this.timeDilationEffect.activate();

    // Slow down monsters
    this.monsterManager.getMonsters().getChildren().forEach((monster: any) => {
      monster.setVelocity(
        monster.body.velocity.x * 0.5,
        monster.body.velocity.y * 0.5
      );
    });

    // Slow down monster bullets
    this.monsterManager.getBullets().getChildren().forEach((bullet: any) => {
      bullet.setVelocity(
        bullet.body.velocity.x * 0.5,
        bullet.body.velocity.y * 0.5
      );
    });
  }

  private deactivateTimeDilation(): void {
    if (!this.monsterManager || !this.timeDilationEffect) return;

    // Deactivate visual effect
    this.timeDilationEffect.deactivate();

    // Restore monster speed
    this.monsterManager.getMonsters().getChildren().forEach((monster: any) => {
      monster.setVelocity(
        monster.body.velocity.x * 2,
        monster.body.velocity.y * 2
      );
    });

    // Restore bullet speed
    this.monsterManager.getBullets().getChildren().forEach((bullet: any) => {
      bullet.setVelocity(
        bullet.body.velocity.x * 2,
        bullet.body.velocity.y * 2
      );
    });
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
    const actualPoints = (points * (this.player?.getScoreMultiplier() ?? 1));
    this.score += actualPoints;
    if (this.scoreText) {
      this.scoreText.setText(`SCORE: ${this.score}`);

      const floatingScore = this.add.text(
        this.scoreText.x + 200,
        this.scoreText.y,
        `+${actualPoints}`,
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

    if (this.player?.hasShield()) {
      this.player?.removeShield();
    } else {
      this.deathSound?.play();
      this.scene.start('GameOverScene', { score: this.score });
    }
  }

  private handlePlayerBulletHit(bullet: Phaser.GameObjects.GameObject, monster: Phaser.GameObjects.GameObject) {
    (bullet as Phaser.Physics.Arcade.Sprite).destroy();
    (monster as Phaser.Physics.Arcade.Sprite).destroy();
    this.addPoints(this.POINTS_PER_KILL);
  }

  update(time: number) {
    if (!this.player || !this.monsterManager || !this.terrainGenerator) return;

    // Update player and check water collision
    this.player.update(this.monsterManager);
    this.player.checkMudCollision(this.terrainGenerator.getWater());

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

    // Update ability buttons
    this.ghostFormButton?.update();
    this.timeDilationButton?.update();
  }

  destroy(): void {
    // Clean up buttons when scene is destroyed
    this.ghostFormButton?.destroy();
    this.timeDilationButton?.destroy();
  }
}