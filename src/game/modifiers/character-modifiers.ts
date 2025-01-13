import { StoreItem } from "../../scenes/store-scene";

export enum ModifierType {
  Speed = 'speed',
  FireRate = 'fireRate',
  Health = 'health',
  ScoreMultiplier = 'scoreMultiplier',
}

interface Modifier {
  type: ModifierType;
  value: number;
  duration?: number;
  startTime?: number;
}

export class CharacterModifiers {
  private modifiers: Map<ModifierType, Modifier[]>;

  constructor() {
    this.modifiers = new Map();
    Object.values(ModifierType).forEach(type => {
      this.modifiers.set(type as ModifierType, []);
    });
  }

  public addModifier(modifier: Modifier): void {
    const currentModifiers = this.modifiers.get(modifier.type) || [];
    
    if (modifier.duration) {
      modifier.startTime = Date.now();
    }
    
    currentModifiers.push(modifier);
    this.modifiers.set(modifier.type, currentModifiers);
  }

  public getModifierValue(type: ModifierType): number {
    const currentModifiers = this.modifiers.get(type) || [];
    const now = Date.now();

    const activeModifiers = currentModifiers.filter(mod => {
      if (!mod.duration || !mod.startTime) return true;
      return now - mod.startTime < mod.duration;
    });

    this.modifiers.set(type, activeModifiers);
    return activeModifiers.reduce((total, mod) => total + mod.value, 0);
  }

  public clearModifiers(type: ModifierType): void {
    this.modifiers.set(type, []);
  }

  public clearAllModifiers(): void {
    Object.values(ModifierType).forEach(type => {
      this.modifiers.set(type as ModifierType, []);
    });
  }

  public applyStoreItem(item: StoreItem): void {
    const modifier = this.getStoreModifier(item);
    if (modifier) {
      this.addModifier(modifier);
    }
  }

  private getStoreModifier(item: StoreItem): Modifier | null {
    switch (item.id) {
      case 'speed_boost':
        return { type: ModifierType.Speed, value: 0.3 };
      case 'rapid_fire':
        return { type: ModifierType.FireRate, value: 0.5 };
      case 'shield':
        return { type: ModifierType.Health, value: 1 };
      case 'double_points':
        return { type: ModifierType.ScoreMultiplier, value: 1 };
      default:
        console.warn(`Unknown store item: ${item.id}`);
        return null;
    }
  }

  public update(): void {
    Object.values(ModifierType).forEach(type => {
      const currentModifiers = this.modifiers.get(type as ModifierType) || [];
      const now = Date.now();

      const activeModifiers = currentModifiers.filter(mod => {
        if (!mod.duration || !mod.startTime) return true;
        return now - mod.startTime < mod.duration;
      });

      this.modifiers.set(type as ModifierType, activeModifiers);
    });
  }
}