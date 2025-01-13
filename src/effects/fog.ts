import Phaser from 'phaser';

export class FogEffect {
  private scene: Phaser.Scene;
  private fog?: Phaser.GameObjects.Rectangle;
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  
  constructor(scene: Phaser.Scene) {
      this.scene = scene;
  }

  public activate(): void {
      const { width, height } = this.scene.scale;

      // Create the fog overlay
      this.fog = this.scene.add.rectangle(0, 0, width, height, 0x666699, 0.2)
          .setOrigin(0)
          .setScrollFactor(0)
          .setDepth(9);

      // Create multiple fog layers
      this.createFogLayer(0.15, 100, 8000, 0.3);  // Slow, large particles
      this.createFogLayer(0.25, 60, 6000, 0.2);   // Medium particles
      this.createFogLayer(0.35, 30, 4000, 0.1);   // Fast, small particles

      // Fade in effect
      this.scene.tweens.add({
          targets: [this.fog],
          alpha: { from: 0, to: 0.2 },
          duration: 500,
          ease: 'Power2'
      });
  }

  private createFogLayer(
      speed: number, 
      size: number, 
      lifespan: number, 
      alpha: number
  ): void {
      const { width, height } = this.scene.scale;
      const camera = this.scene.cameras.main;
      
      const emitter = this.scene.add.particles(camera.scrollX - 100, 0, 'white-circle', {
          scale: { min: size * 0.7, max: size },
          alpha: { start: 0, end: alpha, ease: 'Quad.easeInOut' },
          lifespan: lifespan,
          speedX: { min: speed * 50, max: speed * 100 },
          speedY: { min: -speed * 20, max: speed * 20 },
          quantity: 1,
          frequency: 200,
          blendMode: 'SCREEN',
          emitZone: {
              type: 'random',
              source: new Phaser.Geom.Rectangle(0, 0, 100, height),
              quantity: 1
          },
          follow: this.scene.cameras.main
      });

      this.emitters.push(emitter);
  }

  public update(): void {
      // Update emitter positions relative to camera
      const camera = this.scene.cameras.main;
      this.emitters.forEach(emitter => {
          emitter.setPosition(camera.scrollX - 100, 0);
      });
  }

  public deactivate(): void {
      // Fade out overlay
      if (this.fog) {
          this.scene.tweens.add({
              targets: [this.fog],
              alpha: 0,
              duration: 500,
              ease: 'Power2',
              onComplete: () => {
                  this.fog?.destroy();
              }
          });
      }

      // Stop and destroy emitters
      this.emitters.forEach(emitter => {
          emitter.stop();
          this.scene.time.delayedCall(8000, () => {
              emitter.destroy();
          });
      });
      this.emitters = [];
  }
}