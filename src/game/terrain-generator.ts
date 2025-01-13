import { AssetImagesKeys } from "../config/asset-config";

export class TerrainGenerator {
  private scene: Phaser.Scene;
  private walls: Phaser.Physics.Arcade.StaticGroup;
  private water: Phaser.Physics.Arcade.StaticGroup;

  private readonly WORLD_WIDTH = 2400;
  private readonly WORLD_HEIGHT = 1800;
  private readonly TILE_SIZE = 16;
  private readonly MAX_WALLS = 30;
  private readonly MAX_WATER = 15;
  private readonly WALL_SIZE = 16;
  private readonly WATER_SIZE = 48;
  private readonly MIN_WALL_SPACING = 100;
  private readonly MIN_WATER_SPACING = 150;
  private readonly MIN_SPAWN_DISTANCE = 200;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.walls = scene.physics.add.staticGroup();
    this.water = scene.physics.add.staticGroup();
  }

  public initialize(): void {
    this.scene.physics.world.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

    this.createFloorPattern();

    this.generateWater();
    this.generateWalls();
  }

  public getWorldBounds(): { width: number, height: number } {
    return {
      width: this.WORLD_WIDTH,
      height: this.WORLD_HEIGHT
    };
  }

  public getWalls(): Phaser.Physics.Arcade.StaticGroup {
    return this.walls;
  }

  public getWater(): Phaser.Physics.Arcade.StaticGroup {
    return this.water;
  }

  public getRandomSpawnPosition(playerPos: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    let x: number, y: number, distance: number;
    const rng = new Phaser.Math.RandomDataGenerator([this.scene.data.get('gameSeed') + Date.now()]);

    do {
      x = rng.between(0, this.WORLD_WIDTH);
      y = rng.between(0, this.WORLD_HEIGHT);
      distance = Phaser.Math.Distance.Between(x, y, playerPos.x, playerPos.y);
    } while (distance < this.MIN_SPAWN_DISTANCE);

    return new Phaser.Math.Vector2(x, y);
  }

  private createFloorPattern(): void {
    const PATTERN_SIZE = 512;
    const patternKey = 'FloorPattern';
    const pattern = this.scene.add.renderTexture(0, 0, PATTERN_SIZE, PATTERN_SIZE);

    const rng = new Phaser.Math.RandomDataGenerator([this.scene.data.get('gameSeed')]);
    const tilesX = Math.ceil(PATTERN_SIZE / this.TILE_SIZE);
    const tilesY = Math.ceil(PATTERN_SIZE / this.TILE_SIZE);

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const roll = rng.frac();
        const tileKey = roll < 0.95 ? AssetImagesKeys.FloorMain : AssetImagesKeys.FloorRare;
        pattern.draw(tileKey, x * this.TILE_SIZE, y * this.TILE_SIZE);
      }
    }

    pattern.snapshot((snap) => {
      if (this.scene.textures.exists(patternKey)) {
        this.scene.textures.remove(patternKey);
      }
      this.scene.textures.addImage(patternKey, snap as HTMLImageElement);

      const floor = this.scene.add.tileSprite(
        this.WORLD_WIDTH / 2,
        this.WORLD_HEIGHT / 2,
        this.WORLD_WIDTH,
        this.WORLD_HEIGHT,
        patternKey
      );
      floor.setDepth(-1);
    });

    pattern.destroy();
  }

  private generateWater(): void {
    const rng = new Phaser.Math.RandomDataGenerator([this.scene.data.get('gameSeed')]);
    const numWater = rng.between(8, this.MAX_WATER);

    for (let i = 0; i < numWater; i++) {
      let x = rng.between(this.WATER_SIZE, this.WORLD_WIDTH - this.WATER_SIZE);
      let y = rng.between(this.WATER_SIZE, this.WORLD_HEIGHT - this.WATER_SIZE);

      if (this.isPositionValidForWater(x, y)) {
        const water = this.water.create(x, y, AssetImagesKeys.Mud) as Phaser.Physics.Arcade.Sprite;
        water.setScale(3); // Water pools are larger

        // Set circular physics body
        if (water.body) {
          (water.body as Phaser.Physics.Arcade.Body).setCircle(this.WATER_SIZE / 2);
        }
      }
    }
  }

  private isPositionValidForWater(x: number, y: number): boolean {
    const worldCenterX = this.WORLD_WIDTH / 2;
    const worldCenterY = this.WORLD_HEIGHT / 2;
    const distanceFromCenter = Phaser.Math.Distance.Between(x, y, worldCenterX, worldCenterY);

    if (distanceFromCenter < 200) return false; // Keep center more clear

    // Check distance from other water pools
    let validPosition = true;
    this.water.getChildren().forEach((existingWater: Phaser.GameObjects.GameObject) => {
      const waterSprite = existingWater as Phaser.Physics.Arcade.Sprite;
      const distance = Phaser.Math.Distance.Between(
        x, y,
        waterSprite.x, waterSprite.y
      );
      if (distance < this.MIN_WATER_SPACING) {
        validPosition = false;
      }
    });

    return validPosition;
  }

  private generateWalls(): void {
    const positions = this.generateWallPositions();
    positions.forEach(pos => {
      this.walls.create(pos.x, pos.y, AssetImagesKeys.Wall);
    });
  }

  private generateWallPositions(): { x: number, y: number }[] {
    const rng = new Phaser.Math.RandomDataGenerator([this.scene.data.get('gameSeed')]);
    const positions: { x: number, y: number }[] = [];
    const numWalls = rng.between(8, this.MAX_WALLS);

    let attempts = 0;
    const maxAttempts = 200;

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

  private isPositionValid(x: number, y: number, existingPositions: { x: number, y: number }[]): boolean {
    const worldCenterX = this.WORLD_WIDTH / 2;
    const worldCenterY = this.WORLD_HEIGHT / 2;
    const distanceFromCenter = Phaser.Math.Distance.Between(x, y, worldCenterX, worldCenterY);

    if (distanceFromCenter < 150) return false;

    // Check distance from walls
    for (const pos of existingPositions) {
      const distance = Phaser.Math.Distance.Between(x, y, pos.x, pos.y);
      if (distance < this.MIN_WALL_SPACING) return false;
    }

    // Check distance from water
    let validPosition = true;
    this.water.getChildren().forEach((water: Phaser.GameObjects.GameObject) => {
      const waterSprite = water as Phaser.Physics.Arcade.Sprite;
      const distance = Phaser.Math.Distance.Between(x, y, waterSprite.x, waterSprite.y);
      if (distance < this.MIN_WALL_SPACING) {
        validPosition = false;
      }
    });

    return validPosition;
  }
}