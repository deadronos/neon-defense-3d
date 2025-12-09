import { TOWER_CONFIGS } from '../constants';
import { TowerType } from '../types';

/**
 * Calculates the statistics for a tower based on its type and current level.
 */
export const getTowerStats = (type: TowerType, level: number) => {
  const base = TOWER_CONFIGS[type];
  return {
    damage: base.damage * (1 + (level - 1) * 0.25),
    range: base.range * (1 + (level - 1) * 0.1),
    cooldown: Math.max(0.1, base.cooldown * (1 - (level - 1) * 0.05)),
    upgradeCost: Math.floor(base.cost * Math.pow(1.5, level)),
  };
};
