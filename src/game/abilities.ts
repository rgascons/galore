import { AbilityConfig } from "../ui/ability-button";

type AbilityNames =
  'TimeDilation' |
  'GhostForm';

export const Abilities: Record<AbilityNames, AbilityConfig> = {
  TimeDilation: {
    key: 'T',
    duration: 10000,
    cooldown: 30000,
    icon: '⌛'
  },
  GhostForm: {
    key: 'G',
    duration: 5000,
    cooldown: 60000,
    icon: '👻'
  }
};
