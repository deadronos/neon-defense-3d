import { TOWER_CONFIGS } from '../constants';
import type { ActiveSynergy, TowerType } from '../types';
import { SynergyType, UpgradeType } from '../types';

/**
 * Calculates the statistics for a tower based on its type and current level.
 */
export const getTowerStats = (
  type: TowerType,
  level: number,
  context: { upgrades?: { [key in UpgradeType]?: number }; activeSynergies?: ActiveSynergy[] } = {},
) => {
  const base = TOWER_CONFIGS[type];
  const { upgrades = {}, activeSynergies = [] } = context;

  let dmgMult = 1 + (upgrades[UpgradeType.GLOBAL_DAMAGE] || 0) * 0.05;
  let rangeMult = 1 + (upgrades[UpgradeType.GLOBAL_RANGE] || 0) * 0.05;
  let fireRateMult = 1.0;

  // Apply Synergies
  for (const s of activeSynergies) {
    switch (s.type) {
      case SynergyType.SYNCHRONIZED_FIRE:
        fireRateMult += 0.15;
        break;
      case SynergyType.TRIANGULATION:
        rangeMult += 0.2;
        dmgMult += 0.1;
        break;
      case SynergyType.COVER_FIRE_SOURCE:
        dmgMult += 0.1;
        break;
      case SynergyType.COVER_FIRE_RECEIVER:
        rangeMult += 0.05;
        break;
    }
  }

  // Cooldown is uniform 1/FireRate.
  // Base cooldown is reduced by level. Then we divide by fireRateMult.
  const levelCooldown = Math.max(0.1, base.cooldown * (1 - (level - 1) * 0.05));
  const finalCooldown = levelCooldown / fireRateMult;

  return {
    damage: base.damage * (1 + (level - 1) * 0.25) * dmgMult,
    range: base.range * (1 + (level - 1) * 0.1) * rangeMult,
    cooldown: finalCooldown,
    upgradeCost: Math.floor(base.cost * Math.pow(1.5, level)),
    freezeDuration: base.freezeDuration, // Pass through for gameplay usage
    splashRadius: base.splashRadius, // Pass through for gameplay usage
  };
};
