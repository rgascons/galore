import { BASE_DIR } from '../../constants';

export const Assets = {
  // Specify your asset paths and keys
  Images: {
    Player: BASE_DIR + '/assets/player.png',
    Wall: BASE_DIR + '/assets/wall.png',
    Bullet: BASE_DIR + '/assets/bullet.png',
    Monster: BASE_DIR + '/assets/monster.png',
    FloorMain: BASE_DIR + '/assets/floor-main.png',
    FloorRare: BASE_DIR + '/assets/floor-rare.png',
    // Add more assets as needed
  },
  // Add more asset types (audio, spritesheets, etc.) as needed
} as const;

export const AssetImagesKeys = Object.fromEntries(
  Object.keys(Assets.Images).map(key => [key, key])
 ) as { [K in keyof typeof Assets.Images]: K };