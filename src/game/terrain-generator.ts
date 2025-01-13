import { AssetImagesKeys } from "../config/asset-config";

interface WaterTile {
  x: number;
  y: number;
  sprite?: Phaser.Physics.Arcade.Sprite;
}

export class TerrainGenerator {
  private scene: Phaser.Scene;
  private walls: Phaser.Physics.Arcade.StaticGroup;
  private water: Phaser.Physics.Arcade.StaticGroup;

  private readonly WORLD_WIDTH = 2400;
  private readonly WORLD_HEIGHT = 1800;
  private readonly TILE_SIZE = 16;
  private readonly MAX_WALLS = 30;
  private readonly WALL_SIZE = 16;
  private readonly MIN_WALL_SPACING = 100;
  private readonly MIN_SPAWN_DISTANCE = 200;
  private readonly MAX_WATER_POOLS = 8;
  private readonly MAX_WATER_TILES = 15;
  private readonly MIN_WATER_TILES = 5;
  private readonly MIN_WATER_POOL_SPACING = 200;
  private readonly WATER_GROWTH_DIRECTIONS = [
    {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1},
    {x: 1, y: 1}, {x: -1, y: -1}, {x: 1, y: -1}, {x: -1, y: 1}
  ];

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
    const numPools = rng.between(3, this.MAX_WATER_POOLS);
    const waterPools: WaterTile[][] = [];

    for (let i = 0; i < numPools; i++) {
      let attempts = 0;
      let validPosition = false;
      let startX = 0;
      let startY = 0;

      // Find valid starting position for water pool
      while (!validPosition && attempts < 50) {
        startX = rng.between(this.TILE_SIZE * 2, this.WORLD_WIDTH - this.TILE_SIZE * 2);
        startY = rng.between(this.TILE_SIZE * 2, this.WORLD_HEIGHT - this.TILE_SIZE * 2);
        validPosition = this.isValidWaterPoolPosition(startX, startY, waterPools);
        attempts++;
      }

      if (validPosition) {
        const pool = this.generateWaterPool(startX, startY, rng);
        waterPools.push(pool);
        this.createWaterSprites(pool);
      }
    }
  }

  private isValidWaterPoolPosition(x: number, y: number, existingPools: WaterTile[][]): boolean {
    // Check distance from center
    const worldCenterX = this.WORLD_WIDTH / 2;
    const worldCenterY = this.WORLD_HEIGHT / 2;
    if (Phaser.Math.Distance.Between(x, y, worldCenterX, worldCenterY) < 200) {
      return false;
    }

    // Check distance from other pools
    for (const pool of existingPools) {
      for (const tile of pool) {
        if (Phaser.Math.Distance.Between(x, y, tile.x, tile.y) < this.MIN_WATER_POOL_SPACING) {
          return false;
        }
      }
    }

    return true;
  }

  private generateWaterPool(startX: number, startY: number, rng: Phaser.Math.RandomDataGenerator): WaterTile[] {
    const pool: WaterTile[] = [{x: startX, y: startY}];
    const maxTiles = rng.between(this.MIN_WATER_TILES, this.MAX_WATER_TILES);
    
    while (pool.length < maxTiles) {
      // Pick a random existing tile to grow from
      const sourceTile = rng.pick(pool);
      
      // Pick a random direction to grow
      const direction = rng.pick(this.WATER_GROWTH_DIRECTIONS);
      const newTile = {
        x: sourceTile.x + direction.x * this.TILE_SIZE,
        y: sourceTile.y + direction.y * this.TILE_SIZE
      };

      // Check if the new tile position is valid
      if (this.isValidNewWaterTile(newTile, pool)) {
        pool.push(newTile);
      }

      // Break if we can't grow after too many attempts
      if (pool.length === maxTiles) break;
    }

    return pool;
  }

  private isValidNewWaterTile(newTile: WaterTile, pool: WaterTile[]): boolean {
    // Check world bounds
    if (newTile.x < this.TILE_SIZE * 2 || newTile.x > this.WORLD_WIDTH - this.TILE_SIZE * 2 ||
        newTile.y < this.TILE_SIZE * 2 || newTile.y > this.WORLD_HEIGHT - this.TILE_SIZE * 2) {
      return false;
    }

    // Check if tile already exists in pool
    return !pool.some(tile => 
      tile.x === newTile.x && tile.y === newTile.y
    );
  }

  private createWaterSprites(pool: WaterTile[]): void {
    pool.forEach(tile => {
      const sprite = this.water.create(tile.x, tile.y, AssetImagesKeys.Water) as Phaser.Physics.Arcade.Sprite;
      sprite.setScale(1);
      if (sprite.body) {
        (sprite.body as Phaser.Physics.Arcade.Body).setSize(this.TILE_SIZE, this.TILE_SIZE);
      }
      tile.sprite = sprite;
    });
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