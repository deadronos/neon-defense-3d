import { describe, expect, it } from 'vitest';

import { createDeterministicRng } from '../../../game/engine/rng';
import { applyEnginePatch, createInitialEngineState } from '../../../game/engine/state';
import { stepEngine } from '../../../game/engine/step';
import { TowerType } from '../../../types';
import { EngineTower, EngineEnemy } from '../../../game/engine/types';

const path = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
] as const;

// Helper to create a basic state with a prepared wave
const createPreparedState = (enemies: EngineEnemy[] = [], towers: EngineTower[] = []) => applyEnginePatch(createInitialEngineState(), {
  enemies,
  towers,
  wave: {
    wave: 1,
    phase: 'active',
    enemiesRemainingToSpawn: 0,
    enemiesAlive: enemies.length,
    timerMs: 0,
    spawnIntervalMs: 1000,
  },
});

describe('engine stepEngine', () => {
  it('spawns enemies for the wave and advances them in the same tick', () => {
    const state = applyEnginePatch(createInitialEngineState(), {
      wave: {
        wave: 1,
        phase: 'spawning',
        enemiesRemainingToSpawn: 1,
        enemiesAlive: 0,
        timerMs: 0,
        spawnIntervalMs: 1000,
      },
    });

    const result = stepEngine(
      state,
      path,
      { deltaMs: 1000, nowMs: 0, rng: createDeterministicRng(5) },
      { tileSize: 4 },
    );

    expect(result.patch.enemies?.length).toBe(1);
    expect(result.patch.enemies?.[0].progress).toBeGreaterThan(0);
    expect(result.patch.idCounters?.enemy).toBe(1);
    expect(result.patch.wave?.enemiesAlive).toBe(1);
  });

  it('merges events from wave and enemies while keeping wave enemy counts in sync', () => {
    const state = applyEnginePatch(createInitialEngineState(), {
      enemies: [
        {
          id: 'enemy-1',
          type: 'Drone',
          pathIndex: 0,
          progress: 0.95,
          hp: 50,
          speed: 3,
        } as EngineEnemy,
      ],
    });

    // deltaMs large enough to cause leak
    const context = { deltaMs: 5000, nowMs: 0, rng: createDeterministicRng(2) };
    const result = stepEngine(state, path, context);

    expect(result.events.immediate).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'WaveStarted', wave: 1 }),
      expect.objectContaining({ type: 'LivesLost', amount: 1, source: 'enemy-leak' }),
    ]));
    expect(result.patch.wave?.enemiesAlive).toBe(0);
    expect(result.patch.enemies).toEqual([]);
  });

  it('tower fires projectile when enemy is in range', () => {
    const enemy: EngineEnemy = {
      id: 'e1',
      type: 'Drone',
      pathIndex: 0,
      progress: 0.5, // Center of first tile
      hp: 10,
    };
    
    // Tower at (0, 1) should be in range of (0, 0)
    const tower: EngineTower = {
      id: 't1',
      type: TowerType.Basic,
      level: 1,
      gridPosition: [0, 1],
      lastFired: 0,
    };

    const state = createPreparedState([enemy], [tower]);

    const result = stepEngine(
      state,
      path,
      { deltaMs: 100, nowMs: 1000, rng: createDeterministicRng(1) },
      { tileSize: 4 }
    );

    expect(result.patch.projectiles?.length).toBe(1);
    expect(result.patch.projectiles?.[0].targetId).toBe('e1');
    expect(result.patch.towers?.[0].lastFired).toBe(1000);
  });

  it('projectile hits enemy, deals damage, and grants money on kill', () => {
    const enemy: EngineEnemy = {
      id: 'e1',
      type: 'Drone',
      pathIndex: 0,
      progress: 0.1,
      hp: 5, // Low HP
      reward: 10,
    };

    const state = createPreparedState([enemy], []);
    
    // Manually add a projectile about to hit
    state.projectiles = [{
      id: 'p1',
      origin: [0, 0, 0],
      targetId: 'e1',
      speed: 100, // Very fast
      progress: 0.99, // About to hit
      damage: 10,
      color: '#fff',
    }];

    const result = stepEngine(
      state,
      path,
      { deltaMs: 100, nowMs: 100, rng: createDeterministicRng(1) },
      { tileSize: 4, greedMultiplier: 1 }
    );

    // Projectile should be removed (hit)
    expect(result.patch.projectiles).toEqual([]);
    
    // Enemy should be removed (dead)
    // Note: stepEngine returns undefined for unchanged collections, empty array for emptied ones.
    // If enemy list is processed and becomes empty, it returns [];
    expect(result.patch.enemies).toEqual([]);
    
    // Check events
    const events = [...result.events.immediate, ...result.events.deferred];
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'DamageDealt', amount: 10 }),
      expect.objectContaining({ type: 'EnemyKilled', enemyId: 'e1', reward: 10 }),
    ]));
  });

  it('handles large delta times gracefully without crashing', () => {
    const enemy: EngineEnemy = {
      id: 'e1',
      type: 'Drone',
      pathIndex: 0,
      progress: 0,
      hp: 100,
      speed: 3,
    };
    const state = createPreparedState([enemy]);

    // Very large delta (should cap simulated time or just process end result)
    // Our engine uses fixed movement logic so it should just move the enemy very far (to end of path)
    const result = stepEngine(
      state,
      path,
      { deltaMs: 999999, nowMs: 0, rng: createDeterministicRng(1) },
      { tileSize: 4 }
    );

    // Enemy should leak
    expect(result.events.immediate).toContainEqual(expect.objectContaining({ type: 'LivesLost' }));
    expect(result.patch.enemies).toEqual([]);
  });
});
