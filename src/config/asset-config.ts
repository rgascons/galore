import { BASE_DIR } from '../../constants';

export const Assets = {
  // Specify your asset paths and keys
  Images: {
    Player: BASE_DIR + '/assets/player.png',
    Wall: BASE_DIR + '/assets/wall.png',
    Bullet: BASE_DIR + '/assets/bullet.png',
    Monster: BASE_DIR + '/assets/monster.png',
    HeavyMonster: BASE_DIR + '/assets/heavy-monster.png',
    FloorMain: BASE_DIR + '/assets/floor-main.png',
    FloorRare: BASE_DIR + '/assets/floor-rare.png',
  },
  Sounds: {
    Shoot: BASE_DIR + '/assets/sound/shoot.mp3',
    Death: BASE_DIR + '/assets/sound/death.mp3',
    TimeDilation: BASE_DIR + '/assets/sound/time-dilation.mp3',
    Ghost: BASE_DIR + '/assets/sound/ghost.mp3',
  },
} as const;

export const AssetImagesKeys = Object.fromEntries(
  Object.keys(Assets.Images).map(key => [key, key])
) as { [K in keyof typeof Assets.Images]: K };

export const AssetSoundKeys = Object.fromEntries(
  Object.keys(Assets.Sounds).map(key => [key, key])
) as { [K in keyof typeof Assets.Sounds]: K };