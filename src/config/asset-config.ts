import { BASE_DIR } from '../../constants';

export const Assets = {
  // Specify your asset paths and keys
  Images: {
    Player: BASE_DIR + '/assets/player.png',
    Wall: BASE_DIR + '/assets/wall.png',
    Bullet: BASE_DIR + '/assets/bullet.png',
    Monster: BASE_DIR + '/assets/monster.png',
    // Add more assets as needed
  },
  // Add more asset types (audio, spritesheets, etc.) as needed
} as const;

// Make sure TypeScript knows these are constant values
export type AssetKeys = typeof Assets.Images;