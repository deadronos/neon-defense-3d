import { describe, expect, it } from 'vitest';

import { stepEnemies } from '../../../game/engine/enemy';
import { createInitialEngineState } from '../../../game/engine/state';
import type { EngineEnemy } from '../../../game/engine/types';

const baseEnemy = (overrides: Partial<EngineEnemy> = {}): EngineEnemy => ({
  id: 'enemy-1',
  type: 'Drone',
  pathIndex: 0,
  progress: 0,
  hp: 100,
  speed: 2,
  ...overrides,
});

const context = {
  deltaMs: 500,
  nowMs: 0,
  rng: () => 0.5,
};

const path = [
  [0, 0],
  [1, 0],
] as const;

describe('engine stepEnemies', () => {
  it('advances enemies along the path', () => {
    const state = {
      ...createInitialEngineState(),
      enemies: [baseEnemy()],
    };

    const result = stepEnemies(state, path, context, { tileSize: 2 });
    const moved = result.patch.enemies?.[0];

    expect(moved?.progress).toBeCloseTo(0.5, 3);
    expect(moved?.pathIndex).toBe(0);
    expect(result.events.immediate).toEqual([]);
  });

  it('emits life loss when enemies reach the end', () => {
    const state = {
      ...createInitialEngineState(),
      enemies: [baseEnemy({ progress: 0.9, speed: 4 })],
    };

    const result = stepEnemies(state, path, context, { tileSize: 2 });

    expect(result.patch.enemies).toEqual([]);
    expect(result.events.immediate).toEqual([
      { type: 'LivesLost', amount: 1, source: 'enemy-leak' },
    ]);
  });

  it('applies dash speed multiplier while the ability is active', () => {
    const state = {
      ...createInitialEngineState(),
      enemies: [baseEnemy({ abilityActiveTimer: 0.5, speed: 0.5 })],
    };

    const result = stepEnemies(state, path, context, { tileSize: 2 });
    const dashed = result.patch.enemies?.[0];

    expect(dashed?.progress).toBeGreaterThan(0.2);
    expect(dashed?.abilityActiveTimer).toBeCloseTo(0, 3);
  });

  it('reduces speed when frozen', () => {
    const state = {
      ...createInitialEngineState(),
      enemies: [baseEnemy({ speed: 4, frozen: 1.0 })],
    };

    // speed 4, delta 0.5s. Normal dist = 2.
    // Frozen 50% => speed 2. dist = 1.
    // path is [0,0]->[1,0], dist 2.
    // progress should be 1/2 = 0.5.

    const result = stepEnemies(state, path, context, { tileSize: 2 });
    const moved = result.patch.enemies?.[0];

    expect(moved?.progress).toBeCloseTo(0.5, 3);
    expect(moved?.frozen).toBeCloseTo(0.5, 3); // 1.0 - 0.5
  });
});
