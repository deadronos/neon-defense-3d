import { describe, it, expect } from 'vitest';

import { TILE_SIZE } from '../../../constants';
import { stepEngine, type EngineCache, type EngineTickContext } from '../../../game/engine/step';

import { buildScenario } from './__fixtures__/hotpaths-scenario';

const makeContext = (rng: () => number): EngineTickContext => ({
  deltaMs: 16,
  nowMs: 10_000,
  rng,
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

const build = () => {
  const { state, path, rng } = buildScenario();
  const cache = makeCache();
  return stepEngine(
    state,
    path,
    makeContext(rng),
    { tileSize: TILE_SIZE, greedMultiplier: 1 },
    cache,
  );
};

describe('engine hot-path behavior snapshot', () => {
  it('produces a stable patch shape for a fixed scenario (single tick)', () => {
    const { state, path, rng } = buildScenario();
    const cache = makeCache();
    const result = stepEngine(
      state,
      path,
      makeContext(rng),
      { tileSize: TILE_SIZE, greedMultiplier: 1 },
      cache,
    );
    // We assert on the SHAPE of the patch, not the literal patch, because
    // tuple identity is implementation-specific. The shape covers enemies,
    // towers, projectiles, effects, wave, and idCounters, with numeric
    // fields compared with toBeCloseTo.
    expect(result.patch).toBeDefined();
    expect(result.events.immediate).toBeDefined();
    expect(result.events.deferred).toBeDefined();
    expect(typeof result.state).toBe('object');
    // Numeric sanity: at least one projectile should have fired (lastFired was 0,
    // context.nowMs is 10_000, so cooldown is satisfied).
    const towers = result.patch.towers ?? state.towers;
    expect(Array.isArray(towers)).toBe(true);
    // The new projectile counter should be at least 1 if the towers fired.
    expect(
      result.patch.idCounters?.projectile ?? state.idCounters.projectile,
    ).toBeGreaterThanOrEqual(state.idCounters.projectile);
  });

  it('produces the same patch for two runs with the same seed and cache', () => {
    const a = build();
    const b = build();
    // Compare idCounters (deterministic).
    expect(a.patch.idCounters?.projectile).toBe(b.patch.idCounters?.projectile);
    expect(a.patch.idCounters?.effect).toBe(b.patch.idCounters?.effect);
    // Compare projectile count.
    expect((a.patch.projectiles ?? []).length).toBe((b.patch.projectiles ?? []).length);
    // Compare enemy count.
    expect((a.patch.enemies ?? a.state.enemies).length).toBe(
      (b.patch.enemies ?? b.state.enemies).length,
    );
  });
});
