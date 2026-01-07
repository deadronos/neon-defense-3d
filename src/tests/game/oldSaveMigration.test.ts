import { describe, expect, it, vi } from 'vitest';

vi.mock('../../game/audio/useAudio', () => ({
  useAudio: () => ({
    playSFX: vi.fn(),
  }),
}));

import { MAP_LAYOUTS, getMapGrid } from '../../constants';
import { migrateSave } from '../../game/persistence';

describe('old save migration issue', () => {
  const problematicSave = {
    schemaVersion: 1,
    timestamp: '2025-12-21T23:14:35.115Z',
    settings: { quality: 'high' },
    ui: {
      currentMapIndex: 1,
      money: 3544,
      lives: 20,
      totalEarned: 7099,
      totalSpent: 0,
      totalDamageDealt: 33307,
      totalCurrencyEarned: 7099,
      researchPoints: 34,
      upgrades: {
        GLOBAL_DAMAGE: 36,
        GLOBAL_RANGE: 28,
        GLOBAL_GREED: 34,
      },
    },
    checkpoint: {
      waveToStart: 9,
      towers: [
        { type: 'Cryo', level: 1, x: 0, z: 1 },
        { type: 'Basic', level: 1, x: 2, z: 0 },
        { type: 'Rapid', level: 1, x: 1, z: 2 },
        { type: 'Rapid', level: 1, x: 2, z: 2 },
        { type: 'Basic', level: 1, x: 3, z: 2 },
        { type: 'Cryo', level: 1, x: 4, z: 0 },
        { type: 'Missile', level: 1, x: 4, z: 2 },
        { type: 'Missile', level: 1, x: 5, z: 0 },
        { type: 'Cryo', level: 1, x: 6, z: 2 },
        { type: 'Cryo', level: 1, x: 4, z: 4 },
        { type: 'Missile', level: 1, x: 6, z: 3 },
        { type: 'Basic', level: 1, x: 6, z: 1 },
        { type: 'Basic', level: 1, x: 5, z: 4 },
        { type: 'Basic', level: 1, x: 3, z: 4 },
        { type: 'Basic', level: 1, x: 1, z: 3 },
        { type: 'Basic', level: 1, x: 0, z: 2 },
        { type: 'Basic', level: 1, x: 3, z: 0 },
        { type: 'Sniper', level: 1, x: 0, z: 3 },
        { type: 'Sniper', level: 1, x: 1, z: 4 },
        { type: 'Sniper', level: 1, x: 0, z: 4 },
        { type: 'Sniper', level: 1, x: 6, z: 4 },
        { type: 'Sniper', level: 1, x: 7, z: 4 },
        { type: 'Sniper', level: 1, x: 7, z: 2 },
        { type: 'Sniper', level: 1, x: 7, z: 3 },
        { type: 'Sniper', level: 1, x: 7, z: 1 },
        { type: 'Sniper', level: 1, x: 6, z: 0 },
        { type: 'Sniper', level: 1, x: 7, z: 0 },
        { type: 'Sniper', level: 1, x: 1, z: 5 },
        { type: 'Missile', level: 1, x: 3, z: 6 },
        { type: 'Sniper', level: 1, x: 0, z: 5 },
      ],
    },
  };

  it('MAP_2 layout dimensions are consistent', () => {
    const map2 = MAP_LAYOUTS[1];
    expect(map2.length).toBeGreaterThan(0);
    const width = map2[0]?.length ?? 0;
    expect(width).toBeGreaterThan(0);
    for (const row of map2) expect(row.length).toBe(width);

    const grid = getMapGrid(map2);
    expect(grid.length).toBe(map2.length);
    expect(grid[0]?.length ?? 0).toBe(width);
  });

  it('migrateSave tolerates tower positions without crashing', () => {
    const result = migrateSave(problematicSave);

    // The migration should succeed even if some towers are dropped
    expect(result.ok).toBe(true);
    expect(result.save).toBeDefined();
  });
});
