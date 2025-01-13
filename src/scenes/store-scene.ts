import Phaser from 'phaser';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

export class StoreScene extends Phaser.Scene {
  private money: number = 2000;
  private purchasedItems: StoreItem[] = [];
  private itemContainer?: Phaser.GameObjects.Container;
  private moneyText?: Phaser.GameObjects.Text;
  private startButton?: Phaser.GameObjects.Container;
  private itemCards: Map<string, Phaser.GameObjects.Container> = new Map();

  private storeItems: StoreItem[] = [
    {
      id: 'speed_boost',
      name: 'Speed Boost',
      description: 'Move 30% faster',
      price: 300,
      image: 'speed_item'
    },
    {
      id: 'rapid_fire',
      name: 'Rapid Fire',
      description: 'Shoot 50% faster',
      price: 500,
      image: 'rapid_item'
    },
    {
      id: 'shield',
      name: 'Shield',
      description: 'Survive one hit',
      price: 800,
      image: 'shield_item'
    },
    {
      id: 'double_points',
      name: 'Double Points',
      description: '2x score multiplier',
      price: 1000,
      image: 'points_item'
    },
    {
      id: 'ghost_form',
      name: 'Ghost Form',
      description: 'Phase through walls for 15s\nActivate with [G]',
      price: 1200,
      image: 'ghost_item'
    },
    {
      id: 'time_dilation',
      name: 'Time Dilation',
      description: 'Slow time for 10s\nActivate with [T]',
      price: 800,
      image: 'time_item'
    },
    // All below not implemented
    {
      id: 'bullet_echo',
      name: 'Bullet Echo',
      description: 'Bullets split on wall impact',
      price: 900,
      image: 'echo_item'
    },
    {
      id: 'monster_magnet',
      name: 'Monster Magnet',
      description: 'Pull monsters to cursor',
      price: 700,
      image: 'magnet_item'
    },
    {
      id: 'revenge_blast',
      name: 'Revenge Blast',
      description: 'Explode on death',
      price: 1500,
      image: 'blast_item'
    }
  ];

  constructor() {
    super({ key: 'StoreScene' });
  }

  init({ startingMoney }: { startingMoney: number }) {
    if (startingMoney) {
      this.money = startingMoney;
    }
    this.purchasedItems = [];
    this.itemCards.clear();
  }

  preload() {
    // Load item images
    this.storeItems.forEach(item => {
      this.load.image(item.image, `/assets/${item.image}.png`);
    });
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#2c2c2c');

    // Title
    this.add.text(width / 2, 40, 'STORE', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'serif',
    }).setOrigin(0.5);

    // Money display
    this.moneyText = this.add.text(width - 20, 20, `$${this.money}`, {
      fontSize: '32px',
      color: '#00ff00',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Initialize container
    this.itemContainer = this.add.container(width / 2, 200);

    // Create mask
    const maskGraphics = this.add.graphics();
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(
      (width - (width - 100)) / 2,
      100,
      width - 100,
      height - 200
    );

    const mask = maskGraphics.createGeometryMask();
    this.itemContainer.setMask(mask);
    maskGraphics.setVisible(false);

    // Add items
    this.createStoreItems();

    // Create start button
    this.createStartButton();

    // Scroll handling
    this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
      if (this.itemContainer) {
        this.itemContainer.y -= deltaY;
        const availableItems = this.storeItems.filter(item =>
          !this.purchasedItems.some(purchased => purchased.id === item.id)
        );
        this.itemContainer.y = Phaser.Math.Clamp(
          this.itemContainer.y,
          -(availableItems.length * 160 - (height - 350)),
          200
        );
      }
    });
  }

  private createStoreItems() {
    if (!this.itemContainer) return;

    // Filter out purchased items
    const availableItems = this.storeItems.filter(item =>
      !this.purchasedItems.some(purchased => purchased.id === item.id)
    );

    availableItems.forEach((item, index) => {
      const y = index * 160;
      const card = this.createItemCard(item, y);
      this.itemContainer?.add(card);
      this.itemCards.set(item.id, card);
    });
  }

  private createItemCard(item: StoreItem, y: number): Phaser.GameObjects.Container {
    const card = this.add.container(0, y);

    const bg = this.add.rectangle(0, 0, 700, 140, 0x333333)
      .setStrokeStyle(2, 0x666666);

    const imageBox = this.add.rectangle(-300, 0, 80, 80, 0x444444);

    const nameText = this.add.text(-200, -30, item.name, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'serif',
    });

    const descText = this.add.text(-200, 10, item.description, {
      fontSize: '18px',
      color: '#cccccc',
      fontFamily: 'serif',
    });

    const buyButton = this.add.container(250, 0);
    const buttonBg = this.add.rectangle(0, 0, 120, 40, 0x00aa00);
    const priceText = this.add.text(0, 0, `$${item.price}`, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    buyButton.add([buttonBg, priceText]);

    buttonBg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => buttonBg.setFillStyle(0x00cc00))
      .on('pointerout', () => buttonBg.setFillStyle(0x00aa00))
      .on('pointerdown', () => this.purchaseItem(item));

    card.add([bg, imageBox, nameText, descText, buyButton]);
    return card;
  }

  private async purchaseItem(item: StoreItem) {
    if (this.money >= item.price) {
      this.money -= item.price;
      this.purchasedItems.push(item);

      if (this.moneyText) {
        this.moneyText.setText(`$${this.money}`);
      }

      // Remove the purchased item's card with animation
      const card = this.itemCards.get(item.id);
      if (card) {
        this.tweens.add({
          targets: card,
          alpha: 0,
          x: 100,
          duration: 300,
          onComplete: () => {
            card.destroy();
            this.itemCards.delete(item.id);
            this.reorganizeItems();
          }
        });
      }

      // Show purchase confirmation
      const confirmation = this.add.text(
        this.scale.width / 2,
        this.scale.height / 2,
        'Item Purchased!',
        {
          fontSize: '32px',
          color: '#00ff00',
          backgroundColor: '#000000',
          padding: { x: 20, y: 10 }
        }
      ).setOrigin(0.5);

      this.tweens.add({
        targets: confirmation,
        alpha: 0,
        y: confirmation.y - 50,
        duration: 1000,
        onComplete: () => confirmation.destroy()
      });
    } else {
      // Show insufficient funds message
      const errorMsg = this.add.text(
        this.scale.width / 2,
        this.scale.height / 2,
        'Not enough money!',
        {
          fontSize: '32px',
          color: '#ff0000',
          backgroundColor: '#000000',
          padding: { x: 20, y: 10 }
        }
      ).setOrigin(0.5);

      this.tweens.add({
        targets: errorMsg,
        alpha: 0,
        y: errorMsg.y - 50,
        duration: 1000,
        onComplete: () => errorMsg.destroy()
      });
    }
  }

  private reorganizeItems() {
    // Get remaining cards and reorganize their positions
    const availableItems = this.storeItems.filter(item =>
      !this.purchasedItems.some(purchased => purchased.id === item.id)
    );

    availableItems.forEach((item, index) => {
      const card = this.itemCards.get(item.id);
      if (card) {
        this.tweens.add({
          targets: card,
          y: index * 160,
          duration: 300
        });
      }
    });
  }

  private createStartButton() {
    const { width, height } = this.scale;

    this.startButton = this.add.container(width / 2, height - 60);

    const buttonBg = this.add.rectangle(0, 0, 200, 50, 0x660000);
    const buttonText = this.add.text(0, 0, 'START GAME', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'serif',
    }).setOrigin(0.5);

    this.startButton.add([buttonBg, buttonText]);

    buttonBg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => buttonBg.setFillStyle(0x880000))
      .on('pointerout', () => buttonBg.setFillStyle(0x660000))
      .on('pointerdown', () => {
        this.scene.start('MainScene', {
          purchasedItems: this.purchasedItems
        });
      });
  }
}