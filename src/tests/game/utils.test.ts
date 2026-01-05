import { describe, it, expect } from 'vitest';

import { TOWER_CONFIGS } from '../../constants';
import { getTowerStats } from '../../game/utils';
import { TowerType, UpgradeType, SynergyType } from '../../types';

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
    const stats = getTowerStats(TowerType.Basic, 1, { upgrades });
    const base = TOWER_CONFIGS[TowerType.Basic];

    expect(stats.damage).toBeCloseTo(base.damage * 1.1);
  });

  it('applies global range upgrade', () => {
    const upgrades = { [UpgradeType.GLOBAL_RANGE]: 4 }; // 20% increase
    const stats = getTowerStats(TowerType.Basic, 1, { upgrades });
    const base = TOWER_CONFIGS[TowerType.Basic];

    expect(stats.range).toBeCloseTo(base.range * 1.2);
  });

  it('applies SYNCHRONIZED_FIRE synergy (reduces cooldown)', () => {
    const synergies = [{ type: SynergyType.SYNCHRONIZED_FIRE, partnerId: 'ally-1' }];
    const stats = getTowerStats(TowerType.Basic, 1, { activeSynergies: synergies });
    const base = TOWER_CONFIGS[TowerType.Basic];

    expect(stats.cooldown).toBeCloseTo(base.cooldown / 1.15);
  });

  it('applies TRIANGULATION synergy (range + damage)', () => {
    const synergies = [{ type: SynergyType.TRIANGULATION, partnerId: 'ally-1' }];
    const stats = getTowerStats(TowerType.Basic, 1, { activeSynergies: synergies });
    const base = TOWER_CONFIGS[TowerType.Basic];

    expect(stats.damage).toBeCloseTo(base.damage * 1.1);
    expect(stats.range).toBeCloseTo(base.range * 1.2);
  });

  it('applies COVER_FIRE_SOURCE and COVER_FIRE_RECEIVER synergies', () => {
    const src = [{ type: SynergyType.COVER_FIRE_SOURCE, partnerId: 'ally-1' }];
    const rcv = [{ type: SynergyType.COVER_FIRE_RECEIVER, partnerId: 'ally-1' }];
    const base = TOWER_CONFIGS[TowerType.Basic];

    const sstats = getTowerStats(TowerType.Basic, 1, { activeSynergies: src });
    expect(sstats.damage).toBeCloseTo(base.damage * 1.1);

    const rstats = getTowerStats(TowerType.Basic, 1, { activeSynergies: rcv });
    expect(rstats.range).toBeCloseTo(base.range * 1.05);
  });

  it('stacks multiple synergies correctly', () => {
    const synergies = [
      { type: SynergyType.SYNCHRONIZED_FIRE, partnerId: 'ally-1' },
      { type: SynergyType.TRIANGULATION, partnerId: 'ally-2' },
    ];
    const stats = getTowerStats(TowerType.Basic, 1, { activeSynergies: synergies });
    const base = TOWER_CONFIGS[TowerType.Basic];

    expect(stats.damage).toBeCloseTo(base.damage * 1.1);
    expect(stats.range).toBeCloseTo(base.range * 1.2);
    expect(stats.cooldown).toBeCloseTo(base.cooldown / 1.15);
  });

  it('enforces cooldown lower bound before applying fireRate multiplier', () => {
    // level high enough to trigger levelCooldown < 0.1 clamp
    const highLevel = 20;
    const statsNoSynergy = getTowerStats(TowerType.Basic, highLevel);
    expect(statsNoSynergy.cooldown).toBeCloseTo(0.1);

    const synergies = [{ type: SynergyType.SYNCHRONIZED_FIRE, partnerId: 'ally-1' }];
    const statsWithSynergy = getTowerStats(TowerType.Basic, highLevel, {
      activeSynergies: synergies,
    });
    // clamp happens to 0.1 then divided by 1.15
    expect(statsWithSynergy.cooldown).toBeCloseTo(0.1 / 1.15);
  });
});
