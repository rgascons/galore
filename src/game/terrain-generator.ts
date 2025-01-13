import { AssetImagesKeys } from "../config/asset-config";

interface WaterTile {
  x: number;
  y: number;
  sprite?: Phaser.Physics.Arcade.Sprite;
}

interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  connections: Room[];
}

interface Corridor {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
}

export class TerrainGenerator {
  private scene: Phaser.Scene;
  private walls: Phaser.Physics.Arcade.StaticGroup;
  private water: Phaser.Physics.Arcade.StaticGroup;
  private rooms: Room[] = [];
  private corridors: Corridor[] = [];
  private wallMask?: boolean[][];

  private readonly WORLD_WIDTH = 2400;
  private readonly WORLD_HEIGHT = 1800;
  private readonly TILE_SIZE = 16;
  private readonly MIN_SPAWN_DISTANCE = 200;
  private readonly MIN_ROOM_SIZE = 200;
  private readonly MAX_ROOM_SIZE = 400;
  private readonly MIN_ROOMS = 6;
  private readonly MAX_ROOMS = 10;
  private readonly CORRIDOR_WIDTH = 200;
  private readonly MIN_ROOM_SPACING = 100;
  private readonly MAX_WATER_TILES = 15;
  private readonly MIN_WATER_TILES = 5;
  private readonly WATER_GROWTH_DIRECTIONS = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.walls = scene.physics.add.staticGroup();
    this.water = scene.physics.add.staticGroup();
  }

  public initialize(): void {
    this.scene.physics.world.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
    this.createFloorPattern();
    this.generateRooms();
    this.connectRooms();
    this.generateWalls();
    this.addStrategicMud();
    this.addDetailWalls();
    this.wallMask = this.createWallMask();
  }

  private generateRooms(): void {
    const rng = new Phaser.Math.RandomDataGenerator([this.scene.data.get('gameSeed')]);
    const numRooms = rng.between(this.MIN_ROOMS, this.MAX_ROOMS);

    for (let i = 0; i < numRooms; i++) {
      let attempts = 0;
      let roomPlaced = false;

      while (!roomPlaced && attempts < 50) {
        const width = rng.between(this.MIN_ROOM_SIZE, this.MAX_ROOM_SIZE);
        const height = rng.between(this.MIN_ROOM_SIZE, this.MAX_ROOM_SIZE);
        const x = rng.between(width / 2, this.WORLD_WIDTH - width / 2);
        const y = rng.between(height / 2, this.WORLD_HEIGHT - height / 2);

        const newRoom = { x, y, width, height, connections: [] };

        if (this.isRoomValid(newRoom)) {
          this.rooms.push(newRoom);
          roomPlaced = true;
        }
        attempts++;
      }
    }
  }

  private isRoomValid(room: Room): boolean {
    // Check if room is too close to world edges
    if (room.x - room.width / 2 < 50 ||
      room.x + room.width / 2 > this.WORLD_WIDTH - 50 ||
      room.y - room.height / 2 < 50 ||
      room.y + room.height / 2 > this.WORLD_HEIGHT - 50) {
      return false;
    }

    // Check overlap with existing rooms
    for (const existingRoom of this.rooms) {
      const minDistance = this.MIN_ROOM_SPACING +
        (room.width + existingRoom.width) / 4 +
        (room.height + existingRoom.height) / 4;

      const distance = Phaser.Math.Distance.Between(
        room.x, room.y,
        existingRoom.x, existingRoom.y
      );

      if (distance < minDistance) {
        return false;
      }
    }

    return true;
  }

  private connectRooms(): void {
    // Create minimum spanning tree to ensure connectivity
    const unconnectedRooms = [...this.rooms];
    const connectedRooms = [unconnectedRooms.pop()!];

    while (unconnectedRooms.length > 0) {
      let shortestDistance = Infinity;
      let bestConnection: [Room, Room] | null = null;

      for (const unconnected of unconnectedRooms) {
        for (const connected of connectedRooms) {
          const distance = Phaser.Math.Distance.Between(
            unconnected.x, unconnected.y,
            connected.x, connected.y
          );

          if (distance < shortestDistance) {
            shortestDistance = distance;
            bestConnection = [unconnected, connected];
          }
        }
      }

      if (bestConnection) {
        const [room1, room2] = bestConnection;
        room1.connections.push(room2);
        room2.connections.push(room1);

        this.corridors.push({
          startX: room1.x,
          startY: room1.y,
          endX: room2.x,
          endY: room2.y,
          width: this.CORRIDOR_WIDTH
        });

        const index = unconnectedRooms.indexOf(room1);
        unconnectedRooms.splice(index, 1);
        connectedRooms.push(room1);
      }
    }

    // Add some extra connections for alternative paths
    const rng = new Phaser.Math.RandomDataGenerator([this.scene.data.get('gameSeed')]);
    const extraConnections = Math.floor(this.rooms.length * 0.3);

    for (let i = 0; i < extraConnections; i++) {
      const room1 = rng.pick(this.rooms);
      const room2 = rng.pick(this.rooms.filter(r =>
        r !== room1 && !r.connections.includes(room1)
      ));

      if (room2) {
        room1.connections.push(room2);
        room2.connections.push(room1);

        this.corridors.push({
          startX: room1.x,
          startY: room1.y,
          endX: room2.x,
          endY: room2.y,
          width: this.CORRIDOR_WIDTH
        });
      }
    }
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

  public getRandomRoomCenterPosition(): Phaser.Math.Vector2 {
    const rng = new Phaser.Math.RandomDataGenerator([this.scene.data.get('gameSeed')]);
    const room = rng.pick(this.rooms);
    
    // Get the center of the room
    let x = room.x;
    let y = room.y;
    
    // Verify position with wall mask and adjust if needed
    if (!this.isValidSpawnPosition(x, y)) {
      // Search in a spiral pattern around the center until we find a valid position
      const searchRadius = Math.min(room.width, room.height) / 4;
      for (let r = 1; r <= searchRadius; r += this.TILE_SIZE) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          const testX = x + Math.cos(angle) * r;
          const testY = y + Math.sin(angle) * r;
          
          if (this.isValidSpawnPosition(testX, testY)) {
            return new Phaser.Math.Vector2(testX, testY);
          }
        }
      }
    }
    
    return new Phaser.Math.Vector2(x, y);
  }

  public getRandomSpawnPosition(playerPos: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const rng = new Phaser.Math.RandomDataGenerator([this.scene.data.get('gameSeed') + Date.now()]);
    
    // First decide whether to spawn in a room or corridor
    const spawnInRoom = rng.frac() < 0.7; // 70% chance to spawn in room, 30% in corridor
    
    if (spawnInRoom) {
      return this.getRandomRoomPosition(playerPos, rng);
    } else {
      return this.getRandomCorridorPosition(playerPos, rng);
    }
  }

  private isValidSpawnPosition(x: number, y: number): boolean {
    if (!this.wallMask) return false;
    
    const maskX = Math.floor(x / this.TILE_SIZE);
    const maskY = Math.floor(y / this.TILE_SIZE);
    
    // Check if position is within bounds
    if (maskX < 0 || maskX >= this.wallMask.length || 
        maskY < 0 || maskY >= this.wallMask[0].length) {
      return false;
    }
    
    // Return true if this is NOT a wall (false in the mask means empty space)
    return !this.wallMask[maskX][maskY];
  }

  private getRandomRoomPosition(playerPos: Phaser.Math.Vector2, rng: Phaser.Math.RandomDataGenerator): Phaser.Math.Vector2 {
    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    while (attempts < MAX_ATTEMPTS) {
      // Pick a random room
      const room = rng.pick(this.rooms);
      
      // Get random position within room, keeping some padding from walls
      const padding = this.TILE_SIZE * 2; // 2 tiles padding from walls
      const x = rng.between(
        room.x - room.width/2 + padding, 
        room.x + room.width/2 - padding
      );
      const y = rng.between(
        room.y - room.height/2 + padding, 
        room.y + room.height/2 - padding
      );

      const distance = Phaser.Math.Distance.Between(x, y, playerPos.x, playerPos.y);
      
      // Add wall mask check here
      if (distance >= this.MIN_SPAWN_DISTANCE && this.isValidSpawnPosition(x, y)) {
        return new Phaser.Math.Vector2(x, y);
      }

      attempts++;
    }

    // If we couldn't find a valid random position, try room center
    const furthestRoom = this.getFurthestRoom(playerPos);
    if (this.isValidSpawnPosition(furthestRoom.x, furthestRoom.y)) {
      return new Phaser.Math.Vector2(furthestRoom.x, furthestRoom.y);
    }

    // If even room center isn't valid, systematically search for valid position
    return this.findValidPositionInRoom(furthestRoom);
  }

  private getRandomCorridorPosition(playerPos: Phaser.Math.Vector2, rng: Phaser.Math.RandomDataGenerator): Phaser.Math.Vector2 {
    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    while (attempts < MAX_ATTEMPTS) {
      // Pick a random corridor
      const corridor = rng.pick(this.corridors);
      
      // Calculate corridor direction
      const angle = Math.atan2(
        corridor.endY - corridor.startY,
        corridor.endX - corridor.startX
      );
      
      // Get random position along corridor length
      const length = Phaser.Math.Distance.Between(
        corridor.startX, corridor.startY,
        corridor.endX, corridor.endY
      );
      
      const distance = rng.frac() * length;
      
      // Calculate position along corridor
      const x = corridor.startX + Math.cos(angle) * distance;
      const y = corridor.startY + Math.sin(angle) * distance;
      
      // Add some random offset within corridor width (with padding)
      const padding = this.TILE_SIZE * 2;
      const widthOffset = rng.between(
        -corridor.width/2 + padding,
        corridor.width/2 - padding
      );
      
      const finalX = x + Math.cos(angle + Math.PI/2) * widthOffset;
      const finalY = y + Math.sin(angle + Math.PI/2) * widthOffset;
      
      const playerDistance = Phaser.Math.Distance.Between(
        finalX, finalY,
        playerPos.x, playerPos.y
      );
      
      // Add wall mask check here
      if (playerDistance >= this.MIN_SPAWN_DISTANCE && this.isValidSpawnPosition(finalX, finalY)) {
        return new Phaser.Math.Vector2(finalX, finalY);
      }

      attempts++;
    }

    // If corridor spawn fails, fall back to room spawn
    return this.getRandomRoomPosition(playerPos, rng);
  }

  private getFurthestRoom(playerPos: Phaser.Math.Vector2): Room {
    let furthestDistance = 0;
    let furthestRoom = this.rooms[0];

    for (const room of this.rooms) {
      const distance = Phaser.Math.Distance.Between(
        room.x, room.y,
        playerPos.x, playerPos.y
      );
      
      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthestRoom = room;
      }
    }

    return furthestRoom;
  }

  private findValidPositionInRoom(room: Room): Phaser.Math.Vector2 {
    const startX = Math.floor((room.x - room.width/2) / this.TILE_SIZE);
    const startY = Math.floor((room.y - room.height/2) / this.TILE_SIZE);
    const endX = Math.floor((room.x + room.width/2) / this.TILE_SIZE);
    const endY = Math.floor((room.y + room.height/2) / this.TILE_SIZE);

    // Systematically search for any valid position in the room
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const worldX = x * this.TILE_SIZE + this.TILE_SIZE/2;
        const worldY = y * this.TILE_SIZE + this.TILE_SIZE/2;
        if (this.isValidSpawnPosition(worldX, worldY)) {
          return new Phaser.Math.Vector2(worldX, worldY);
        }
      }
    }

    // If we somehow still can't find a valid position (should never happen),
    // return room center and log an error
    console.error('Could not find valid spawn position in room');
    return new Phaser.Math.Vector2(room.x, room.y);
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

  private generateMudPool(startX: number, startY: number, rng: Phaser.Math.RandomDataGenerator): void {
    const pool: WaterTile[] = [{ x: startX, y: startY }];
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

    // Create the actual mud sprites in the game world
    pool.forEach(tile => {
      const mudSprite = this.water.create(tile.x, tile.y, AssetImagesKeys.Water);
      mudSprite.setAlpha(0.6); // Make it semi-transparent
      mudSprite.setDisplaySize(this.TILE_SIZE, this.TILE_SIZE);
    });
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

  private generateWalls(): void {
    // Create wall mask using rooms and corridors
    const wallMask = this.createWallMask();

    // Place walls based on the mask
    for (let x = 0; x < this.WORLD_WIDTH; x += this.TILE_SIZE) {
      for (let y = 0; y < this.WORLD_HEIGHT; y += this.TILE_SIZE) {
        if (wallMask[Math.floor(x / this.TILE_SIZE)][Math.floor(y / this.TILE_SIZE)]) {
          this.walls.create(x, y, AssetImagesKeys.Wall);
        }
      }
    }
  }

  private createWallMask(): boolean[][] {
    const maskWidth = Math.ceil(this.WORLD_WIDTH / this.TILE_SIZE);
    const maskHeight = Math.ceil(this.WORLD_HEIGHT / this.TILE_SIZE);
    const mask = Array(maskWidth).fill(null).map(() => Array(maskHeight).fill(true));

    // Carve out rooms
    for (const room of this.rooms) {
      const startX = Math.floor((room.x - room.width / 2) / this.TILE_SIZE);
      const startY = Math.floor((room.y - room.height / 2) / this.TILE_SIZE);
      const endX = Math.floor((room.x + room.width / 2) / this.TILE_SIZE);
      const endY = Math.floor((room.y + room.height / 2) / this.TILE_SIZE);

      for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
          if (x >= 0 && x < maskWidth && y >= 0 && y < maskHeight) {
            mask[x][y] = false;
          }
        }
      }
    }

    // Carve out corridors
    for (const corridor of this.corridors) {
      const angle = Math.atan2(corridor.endY - corridor.startY, corridor.endX - corridor.startX);
      const length = Phaser.Math.Distance.Between(
        corridor.startX, corridor.startY,
        corridor.endX, corridor.endY
      );

      for (let d = 0; d < length; d += this.TILE_SIZE) {
        const x = corridor.startX + Math.cos(angle) * d;
        const y = corridor.startY + Math.sin(angle) * d;

        // Carve corridor width
        for (let w = -corridor.width / 2; w < corridor.width / 2; w += this.TILE_SIZE) {
          const perpX = x + Math.cos(angle + Math.PI / 2) * w;
          const perpY = y + Math.sin(angle + Math.PI / 2) * w;

          const maskX = Math.floor(perpX / this.TILE_SIZE);
          const maskY = Math.floor(perpY / this.TILE_SIZE);

          if (maskX >= 0 && maskX < maskWidth && maskY >= 0 && maskY < maskHeight) {
            mask[maskX][maskY] = false;
          }
        }
      }
    }

    return mask;
  }

  private addStrategicMud(): void {
    const rng = new Phaser.Math.RandomDataGenerator([this.scene.data.get('gameSeed')]);

    // Add mud in corridors and room corners
    for (const corridor of this.corridors) {
      if (rng.frac() < 0.3) { // 30% chance for mud in corridor
        const mudX = (corridor.startX + corridor.endX) / 2;
        const mudY = (corridor.startY + corridor.endY) / 2;
        this.generateMudPool(mudX, mudY, rng);
      }
    }

    // Add mud in some room corners
    for (const room of this.rooms) {
      if (rng.frac() < 0.4) { // 40% chance for mud in room
        const cornerX = room.x + (rng.frac() - 0.5) * (room.width * 0.6);
        const cornerY = room.y + (rng.frac() - 0.5) * (room.height * 0.6);
        this.generateMudPool(cornerX, cornerY, rng);
      }
    }
  }

  private addDetailWalls(): void {
    const rng = new Phaser.Math.RandomDataGenerator([this.scene.data.get('gameSeed')]);

    // Add cover and obstacles within rooms
    for (const room of this.rooms) {
      const numDetails = Math.floor(rng.between(2, 5));

      for (let i = 0; i < numDetails; i++) {
        const x = room.x + (rng.frac() - 0.5) * (room.width * 0.6);
        const y = room.y + (rng.frac() - 0.5) * (room.height * 0.6);

        // Create small wall clusters for cover
        this.createDetailWallCluster(x, y, rng);
      }
    }
  }

  private createDetailWallCluster(x: number, y: number, rng: Phaser.Math.RandomDataGenerator): void {
    const clusterSize = rng.between(2, 4);

    for (let i = 0; i < clusterSize; i++) {
      const offsetX = (rng.frac() - 0.5) * 48;
      const offsetY = (rng.frac() - 0.5) * 48;
      this.walls.create(x + offsetX, y + offsetY, AssetImagesKeys.Wall);
    }
  }
}