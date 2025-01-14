import Phaser from 'phaser';
import { MainScene } from '../scenes/main-scene';
import { GameOverScene } from '../scenes/game-over-scene';
import { StoreScene } from '../scenes/store-scene';

const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

const getParentSize = () => {
  const gameContainer = document.getElementById('game-content');
  if (!gameContainer) return { width: BASE_WIDTH, height: BASE_HEIGHT };
  
  return {
    width: gameContainer.clientWidth,
    height: gameContainer.clientHeight
  };
};

const calculateGameSize = () => {
  const { width, height } = getParentSize();
  const aspectRatio = BASE_WIDTH / BASE_HEIGHT;
  
  let gameWidth = width;
  let gameHeight = height;
  
  // Maintain aspect ratio while fitting within parent
  const containerRatio = width / height;
  if (containerRatio > aspectRatio) {
    // Parent is wider than needed
    gameWidth = height * aspectRatio;
  } else {
    // Parent is taller than needed
    gameHeight = width / aspectRatio;
  }
  
  return {
    width: Math.round(gameWidth),
    height: Math.round(gameHeight)
  };
};

const createResizeHandler = (game: Phaser.Game) => {
  const resize = () => {
    const { width, height } = calculateGameSize();
    game.scale.resize(width, height);
    
    // Center the game in the parent container
    const canvas = game.canvas;
    const parent = canvas.parentElement;
    if (parent) {
      canvas.style.position = 'absolute';
      canvas.style.left = `${(parent.clientWidth - width) / 2}px`;
      canvas.style.top = `${(parent.clientHeight - height) / 2}px`;
    }
  };
  
  window.addEventListener('resize', resize);
  return resize;
};

// Game configuration
export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-content',
  backgroundColor: '#28282B',
  scale: {
    mode: Phaser.Scale.NONE, // We'll handle scaling manually
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [StoreScene, MainScene, GameOverScene],
  callbacks: {
    postBoot: (game: Phaser.Game) => {
      const resize = createResizeHandler(game);
      resize();
    }
  }
};