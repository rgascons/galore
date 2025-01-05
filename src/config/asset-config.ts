export const Assets = {
  // Specify your asset paths and keys
  Images: {
    // Update these paths to match your Kenney assets
    Player: '/assets/player.png',
    Wall: '/assets/wall.png',
    Bullet: '/assets/bullet.png',
    // Add more assets as needed
  },
  // Add more asset types (audio, spritesheets, etc.) as needed
} as const;

// Make sure TypeScript knows these are constant values
export type AssetKeys = typeof Assets.Images;