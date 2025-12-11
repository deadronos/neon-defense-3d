import { describe, it, expect } from 'vitest';
import { getTowerStats } from '../../game/utils';
import { TowerType, UpgradeType } from '../../types';
import { TOWER_CONFIGS } from '../../constants';

describe('getTowerStats', () => {
  it('calculates base stats for level 1 tower without upgrades', () => {
    const stats = getTowerStats(TowerType.Basic, 1);
    const base = TOWER_CONFIGS[TowerType.Basic];
    expect(stats.damage).toBe(base.damage);
    expect(stats.range).toBe(base.range);
    expect(stats.cooldown).toBe(base.cooldown);
    expect(stats.upgradeCost).toBe(Math.floor(base.cost * 1.5));
  });

  it('scales stats with level', () => {
    const stats = getTowerStats(TowerType.Basic, 2);
    const base = TOWER_CONFIGS[TowerType.Basic];
    // damage: base * (1 + (2-1)*0.25) = base * 1.25
    expect(stats.damage).toBe(base.damage * 1.25);
    // range: base * (1 + (2-1)*0.1) = base * 1.1
    expect(stats.range).toBe(base.range * 1.1);
    // cooldown: base * (1 - (2-1)*0.05) = base * 0.95
    expect(stats.cooldown).toBeCloseTo(base.cooldown * 0.95);
  });

  it('applies global damage upgrade', () => {
    const upgrades = { [UpgradeType.GLOBAL_DAMAGE]: 2 }; // 10% increase
    const stats = getTowerStats(TowerType.Basic, 1, upgrades);
    const base = TOWER_CONFIGS[TowerType.Basic];

    expect(stats.damage).toBeCloseTo(base.damage * 1.10);
  });

  it('applies global range upgrade', () => {
     const upgrades = { [UpgradeType.GLOBAL_RANGE]: 4 }; // 20% increase
     const stats = getTowerStats(TowerType.Basic, 1, upgrades);
     const base = TOWER_CONFIGS[TowerType.Basic];

     expect(stats.range).toBeCloseTo(base.range * 1.20);
  });
});
