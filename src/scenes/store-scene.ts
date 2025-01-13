import Phaser from 'phaser';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

export class StoreScene extends Phaser.Scene {
  private money: number = 1000; // Starting money
  private purchasedItems: StoreItem[] = [];
  private itemContainer?: Phaser.GameObjects.Container;
  private moneyText?: Phaser.GameObjects.Text;
  private startButton?: Phaser.GameObjects.Container;

  // Sample store items
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
    // Add more items as needed
  ];

  constructor() {
    super({ key: 'StoreScene' });
  }

  init({ startingMoney }: { startingMoney: number}) {
    if (startingMoney) {
      this.money = startingMoney;
    }
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

    // Initialize container starting much lower
    this.itemContainer = this.add.container(width / 2, 200); // Changed from 100/150 to 200

    // Create mask
    const maskGraphics = this.add.graphics();
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(
      (width - (width - 100)) / 2,
      100,  // Mask starts higher than the container
      width - 100,
      height - 200  // Reduced mask height to avoid cutting off at bottom
    );

    const mask = maskGraphics.createGeometryMask();
    this.itemContainer.setMask(mask);
    maskGraphics.setVisible(false);

    // Add items
    this.createStoreItems();

    // Create start button
    this.createStartButton();

    // Scroll handling with adjusted boundaries
    this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
      if (this.itemContainer) {
        this.itemContainer.y -= deltaY;
        this.itemContainer.y = Phaser.Math.Clamp(
          this.itemContainer.y,
          -(this.storeItems.length * 160 - (height - 350)), // Adjusted clamp
          200 // Match initial container y position
        );
      }
    });
  }

  createStoreItems() {
    if (!this.itemContainer) return;

    this.storeItems.forEach((item, index) => {
      const y = index * 160; // Keep 160px spacing between items

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
      this.itemContainer?.add(card);
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

  private purchaseItem(item: StoreItem) {
    if (this.money >= item.price) {
      this.money -= item.price;
      this.purchasedItems.push(item);

      if (this.moneyText) {
        this.moneyText.setText(`$${this.money}`);
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
}