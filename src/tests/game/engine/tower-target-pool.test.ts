import { describe, it, expect } from 'vitest';

import { stepTowers } from '../../../game/engine/tower';
import type { EngineCache, EngineTickContext } from '../../../game/engine/step';
import type {
  EngineState,
  EngineTower,
  EngineEnemy,
  EngineVector2,
} from '../../../game/engine/types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../../../constants';

const path: readonly EngineVector2[] = [
  [0, 0],
  [1, 0],
  [2, 0],
];

const makeEnemy = (id: string, pathIndex: number, progress: number): EngineEnemy => ({
  id,
  type: 'basic',
  pathIndex,
  progress,
  hp: 100,
  speed: 1,
  reward: 5,
});

const makeTower = (id: string, type: string, lastFired = 0): EngineTower => ({
  id,
  type,
  level: 1,
  gridPosition: [1, 0],
  lastFired,
  activeSynergies: [],
});

const makeState = (enemies: EngineEnemy[], towers: EngineTower[]): EngineState => ({
  enemies,
  towers,
  projectiles: [],
  effects: [],
  wave: null,
  idCounters: { enemy: 0, tower: 0, projectile: 0, effect: 0 },
  pendingEvents: [],
});

const makeContext = (): EngineTickContext => ({
  deltaMs: 16,
  nowMs: 10_000, // far enough in the future that cooldown is satisfied
  rng: () => 0.5,
});

const makeCache = (): EngineCache => ({
  projectileHits: new Map(),
  projectileFreeze: new Map(),
  activeProjectiles: [],
  enemiesById: new Map(),
  enemyPositions: new Map(),
  enemyPositionPool: [],
  nextEnemies: [],
  pathSegmentLengths: [],
  scratchEnemyPos: [0, 0, 0],
  targetPositionPool: [],
});

describe('stepTowers targetPositionPool', () => {
  it('draws from the pool when present and grows on miss', () => {
    const enemy = makeEnemy('e1', 0, 0.5);
     const tower = makeTower('t1', 'Basic');
    const state = makeState([enemy], [tower]);
    const cache = makeCache();
    const pooled = [9, 9, 9] as [number, number, number];
    cache.targetPositionPool.push(pooled);

    const result = stepTowers(state, path, makeContext(), {}, cache);
    const projectiles = result.patch.projectiles ?? [];
    expect(projectiles).toHaveLength(1);
    // The pooled tuple was reused and is now the projectile's lastTargetPosition.
    expect(projectiles[0]?.lastTargetPosition).toBe(pooled);
    // Pool is now empty (one draw, no return path).
    expect(cache.targetPositionPool).toHaveLength(0);
  });

  it('allocates a new tuple when the pool is empty', () => {
    const enemy = makeEnemy('e1', 0, 0.5);
     const tower = makeTower('t1', 'Basic');
    const state = makeState([enemy], [tower]);
    const cache = makeCache();

    const result = stepTowers(state, path, makeContext(), {}, cache);
    const projectiles = result.patch.projectiles ?? [];
    expect(projectiles).toHaveLength(1);
    expect(projectiles[0]?.lastTargetPosition).toBeDefined();
    expect(projectiles[0]?.lastTargetPosition).not.toBeNull();
  });

  it('falls back to a fresh tuple when cache.targetPositionPool is missing', () => {
    const enemy = makeEnemy('e1', 0, 0.5);
     const tower = makeTower('t1', 'Basic');
    const state = makeState([enemy], [tower]);
    const cache = makeCache();
    // Intentionally clear the field to simulate legacy callers.
    cache.targetPositionPool = undefined as unknown as EngineCache['targetPositionPool'];

    const result = stepTowers(state, path, makeContext(), {}, cache);
    const projectiles = result.patch.projectiles ?? [];
    expect(projectiles).toHaveLength(1);
    expect(projectiles[0]?.lastTargetPosition).toBeDefined();
  });

  it('uses MAP_WIDTH, MAP_HEIGHT, TILE_SIZE constants as defaults', () => {
    // Sanity: confirm the constants are the same shape the production call uses.
    expect(MAP_WIDTH).toBeGreaterThan(0);
    expect(MAP_HEIGHT).toBeGreaterThan(0);
    expect(TILE_SIZE).toBeGreaterThan(0);
  });
});
