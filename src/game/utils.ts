import { TOWER_CONFIGS } from '../constants';
import type { ActiveSynergy, TowerType } from '../types';
import { SynergyType, UpgradeType } from '../types';

export const MAX_RESEARCH_LEVEL = 10;
export const getResearchCost = (level: number) => 1 + (level * (level + 1)) / 2;
const getTowerUpgradeCost = (baseCost: number, level: number) =>
  Math.floor(baseCost * 0.55 * Math.pow(1.45, level - 1));

const SELL_REFUND_RATE = 0.7;

/**
 * Calculates the total amount invested into a tower, including all upgrade costs
 * already paid for the current level.
 */
export const calculateTowerTotalInvestment = (type: TowerType, level: number) => {
  const base = TOWER_CONFIGS[type];

  let totalInvestment = base.cost;
  for (let l = 1; l < level; l += 1) {
    totalInvestment += getTowerUpgradeCost(base.cost, l);
  }

  return totalInvestment;
};

export const calculateTowerRefundValue = (type: TowerType, level: number) =>
  Math.floor(calculateTowerTotalInvestment(type, level) * SELL_REFUND_RATE);

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

  let dmgMult = 1 + (upgrades[UpgradeType.GLOBAL_DAMAGE] ?? 0) * 0.05;
  let rangeMult = 1 + (upgrades[UpgradeType.GLOBAL_RANGE] ?? 0) * 0.05;
  let fireRateMult = 1.0;

  // Apply Synergies
  for (const s of activeSynergies) {
    switch (s.type) {
      case SynergyType.SYNCHRONIZED_FIRE:
        fireRateMult += 0.15;
        break;
      case SynergyType.SHATTER:
        dmgMult += 0.2;
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
  const levelCooldown = Math.max(base.cooldown * 0.5, base.cooldown * (1 - (level - 1) * 0.05));
  const finalCooldown = levelCooldown / fireRateMult;

  return {
    damage: Math.floor(base.damage * Math.pow(1.5, level - 1) * dmgMult),
    range: base.range * (1 + (level - 1) * 0.1) * rangeMult,
    cooldown: finalCooldown,
    upgradeCost: getTowerUpgradeCost(base.cost, level),
    cost: base.cost, // Base placement cost
    freezeDuration:
      base.freezeDuration === undefined ? undefined : base.freezeDuration * (1 + (level - 1) * 0.2),
    splashRadius:
      base.splashRadius === undefined ? undefined : base.splashRadius * (1 + (level - 1) * 0.15),
  };
};
