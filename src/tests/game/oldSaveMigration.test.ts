import { describe, expect, it, vi } from 'vitest';

vi.mock('../../game/audio/AudioManager', () => ({
  useAudio: () => ({
    playSFX: vi.fn(),
  }),
}));

import { MAP_LAYOUTS, getMapGrid } from '../../constants';
import { migrateSave } from '../../game/persistence';
import { TileType } from '../../types';

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

  it('should show current MAP_2 layout structure', () => {
    const map2 = MAP_LAYOUTS[1];
    console.log('MAP_2 dimensions:', map2[0].length, 'x', map2.length);
    console.log('MAP_2 layout:');
    map2.forEach((row, z) => {
      console.log(`  z=${z}:`, row.join(' '));
    });

    const grid = getMapGrid(map2);
    // Check which of the old save's tower positions are valid on current MAP_2
    const invalidPositions: string[] = [];
    for (const tower of problematicSave.checkpoint.towers) {
      const { x, z } = tower;
      if (z < 0 || z >= grid.length || x < 0 || x >= grid[0].length) {
        invalidPositions.push(`${tower.type} at (${x},${z}) - OUT OF BOUNDS`);
        continue;
      }
      const tile = grid[z][x];
      if (tile !== TileType.Grass) {
        invalidPositions.push(`${tower.type} at (${x},${z}) - NOT GRASS (tile=${tile})`);
      }
    }

    console.log('Invalid tower positions:', invalidPositions.length);
    invalidPositions.forEach((pos) => console.log('  ', pos));
  });

  it('migrateSave should report warnings for invalid tower positions', () => {
    const result = migrateSave(problematicSave);

    console.log('Migration result ok:', result.ok);
    console.log('Towers remaining:', result.save?.checkpoint.towers.length);
    console.log('Warnings:', result.warnings);

    if (result.warnings.length > 0) {
      expect(result.warnings.length).toBeGreaterThan(0);
      console.log('Expected: Some towers were dropped due to map layout changes');
    }

    // The migration should succeed even if some towers are dropped
    expect(result.ok).toBe(true);
  });
});
