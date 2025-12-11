/**
 * Test suite for verifying game constants and configuration.
 * Ensures map dimensions, pathfinding generation, and entity configurations are valid.
 */
import { describe, it, expect } from 'vitest';

import {
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_SIZE,
  INITIAL_PATH,
  ENEMY_TYPES,
  TOWER_CONFIGS,
} from '@/constants';

describe('constants', () => {
  it('has correct map width and height', () => {
    expect(MAP_WIDTH).toBe(12);
    expect(MAP_HEIGHT).toBe(8);
    expect(TILE_SIZE).toBe(2);
  });

  it('generates INITIAL_PATH', () => {
    expect(Array.isArray(INITIAL_PATH)).toBe(true);
    expect(INITIAL_PATH.length).toBeGreaterThan(0);
  });

  it('defines ENEMY_TYPES', () => {
    expect(ENEMY_TYPES.BASIC.hpBase).toBeGreaterThan(0);
  });

  it('has tower configs', () => {
    expect(Object.keys(TOWER_CONFIGS).length).toBeGreaterThan(0);
  });
});
