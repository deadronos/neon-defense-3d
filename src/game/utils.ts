import { TOWER_CONFIGS } from '../constants';
import { TowerType } from '../types';

import { UpgradeType } from '../types';

/**
 * Calculates the statistics for a tower based on its type and current level.
 */
export const getTowerStats = (
  type: TowerType,
  level: number,
  upgrades: { [key in UpgradeType]?: number } = {}
) => {
  const base = TOWER_CONFIGS[type];
  
  const dmgMult = 1 + (upgrades[UpgradeType.GLOBAL_DAMAGE] || 0) * 0.05;
  const rangeMult = 1 + (upgrades[UpgradeType.GLOBAL_RANGE] || 0) * 0.05;

  return {
    damage: base.damage * (1 + (level - 1) * 0.25) * dmgMult,
    range: base.range * (1 + (level - 1) * 0.1) * rangeMult,
    cooldown: Math.max(0.1, base.cooldown * (1 - (level - 1) * 0.05)),
    upgradeCost: Math.floor(base.cost * Math.pow(1.5, level)),
  };
};
