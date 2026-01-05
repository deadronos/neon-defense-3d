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
  generatePath,
} from '@/constants';

describe('constants', () => {
  const makeEmptyMap = () => Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));

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

  it('generatePath returns [] when spawn or base is missing', () => {
    const noSpawn = makeEmptyMap();
    // base at [1,1]
    noSpawn[1][1] = 3;
    expect(generatePath(noSpawn)).toEqual([]);

    const noBase = makeEmptyMap();
    // spawn at [1,1]
    noBase[1][1] = 2;
    expect(generatePath(noBase)).toEqual([]);
  });

  it('generatePath returns [] when there is no walkable route to base', () => {
    const map = makeEmptyMap();
    map[1][1] = 2; // spawn
    map[6][10] = 3; // base
    // No Path(1) tiles connecting them
    expect(generatePath(map)).toEqual([]);
  });
});
