export interface AbilityConfig {
  key: string;        // Keyboard key for activation
  duration: number;   // Duration in milliseconds
  cooldown: number;   // Duration in milliseconds
  icon: string;       // Text or icon to display
}

export class AbilityButton {
  private button: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private cooldownOverlay: Phaser.GameObjects.Graphics;
  private keyText: Phaser.GameObjects.Text;
  private isActive: boolean = false;
  private activationTime?: number;
  private config: AbilityConfig;
  private onActivate: () => void;
  private onDeactivate: () => void;
  private hotkey: Phaser.Input.Keyboard.Key;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: AbilityConfig,
    onActivate: () => void,
    onDeactivate: () => void
  ) {
    this.config = config;
    this.onActivate = onActivate;
    this.onDeactivate = onDeactivate;

    // Create container
    this.button = scene.add.container(x, y);

    // Create background
    this.background = scene.add.rectangle(0, 0, 50, 50, 0x333333)
      .setStrokeStyle(2, 0x666666);

    // Create cooldown overlay
    this.cooldownOverlay = scene.add.graphics();
    this.cooldownOverlay.setVisible(false);

    // Create ability icon/text
    const abilityText = scene.add.text(0, -10, config.icon, {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Create hotkey text
    this.keyText = scene.add.text(0, 15, `[${config.key.toUpperCase()}]`, {
      fontSize: '12px',
      color: '#999999',
    }).setOrigin(0.5);

    // Add everything to container
    this.button.add([this.background, this.cooldownOverlay, abilityText, this.keyText]);

    // Set up interaction
    this.background.setInteractive({ useHandCursor: true })
      .on('pointerover', () => !this.isActive && this.background.setFillStyle(0x444444))
      .on('pointerout', () => !this.isActive && this.background.setFillStyle(0x333333))
      .on('pointerdown', () => this.activate());

    // Add hotkey
    this.hotkey = scene.input.keyboard?.addKey(config.key)!;
    this.hotkey.on('down', () => this.activate());

    // Fix position on screen and set depth
    this.button.setScrollFactor(0);
    this.button.setDepth(100);
  }

  private activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.activationTime = Date.now();
    this.background.setFillStyle(0x666666);
    this.onActivate();

    // Set up deactivation timer
    this.button.scene.time.delayedCall(this.config.duration, () => {
      this.onDeactivate();
    });

    // Set up cooldown timer
    this.button.scene.time.delayedCall(this.config.cooldown, () => {
      this.isActive = false;
      this.background.setFillStyle(0x333333);
      this.cooldownOverlay.clear();
      this.cooldownOverlay.setVisible(false);
    });
  }

  public update(): void {
    if (!this.isActive || !this.activationTime) return;

    // Update cooldown overlay
    const elapsed = Date.now() - this.activationTime;
    const progress = Math.min(elapsed / this.config.cooldown, 1);

    this.cooldownOverlay.clear();
    this.cooldownOverlay.setVisible(true);
    this.cooldownOverlay.fillStyle(0x000000, 0.5);
    this.cooldownOverlay.beginPath();
    this.cooldownOverlay.moveTo(0, 0);
    this.cooldownOverlay.arc(0, 0, 25, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * (1 - progress)));
    this.cooldownOverlay.lineTo(0, 0);
    this.cooldownOverlay.closePath();
    this.cooldownOverlay.fill();
  }

  public destroy(): void {
    this.hotkey.destroy();
    this.button.destroy();
  }
}