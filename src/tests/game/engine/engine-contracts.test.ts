import { describe, expect, it } from 'vitest';

import { mergeEvents } from '../../../game/engine/events';
import { createDeterministicRng } from '../../../game/engine/rng';
import { applyEngineRuntimeAction } from '../../../game/engine/runtime';
import {
  selectEnemyWorldPosition,
  selectProjectileWorldPosition,
} from '../../../game/engine/selectors';
import {
  allocateId,
  applyEnginePatch,
  createInitialEngineState,
  engineReducer,
  removeEffectById,
  resolveEngineTick,
} from '../../../game/engine/state';
import type { EngineEnemy, EngineEvents, EngineTickResult } from '../../../game/engine/types';
import { createInitialUiState } from '../../../game/engine/uiReducer';

describe('engine id allocation', () => {
  it('increments deterministic counters per entity type', () => {
    const initial = createInitialEngineState();
    const { id: enemyId, state: afterEnemy } = allocateId(initial, 'enemy');
    const { id: projectileId, state: afterProjectile } = allocateId(afterEnemy, 'projectile');
    const { id: secondEnemy, state: finalState } = allocateId(afterProjectile, 'enemy');

    expect(enemyId).toBe('enemy-1');
    expect(projectileId).toBe('projectile-1');
    expect(secondEnemy).toBe('enemy-2');
    expect(finalState.idCounters).toEqual({ enemy: 2, tower: 0, projectile: 1, effect: 0 });
  });
});

describe('engine event handling contract', () => {
  it('promotes deferred events from previous tick to immediate processing', () => {
    const startingState = applyEnginePatch(createInitialEngineState(), {
      pendingEvents: [{ type: 'MoneyAwarded', amount: 5 }],
    });

    const result: EngineTickResult = {
      patch: {},
      events: {
        immediate: [{ type: 'LivesLost', amount: 1 }],
        deferred: [{ type: 'MoneyAwarded', amount: 10 }],
      },
    };

    const { state: nextState, immediateEvents } = resolveEngineTick(startingState, result);

    expect(immediateEvents).toEqual([
      { type: 'MoneyAwarded', amount: 5 },
      { type: 'LivesLost', amount: 1 },
    ]);
    expect(nextState.pendingEvents).toEqual([{ type: 'MoneyAwarded', amount: 10 }]);
  });

  it('allows deferred-only events to accumulate without dropping pending ones', () => {
    const pending: EngineEvents = {
      immediate: [],
      deferred: [
        { type: 'WaveStarted', wave: 3 },
        { type: 'EffectSpawned', effectId: 'fx-1' },
      ],
    };

    const stateWithPending = applyEnginePatch(createInitialEngineState(), {
      pendingEvents: [{ type: 'LivesLost', amount: 2 }],
    });

    const nextState = applyEnginePatch(stateWithPending, { pendingEvents: pending.deferred });
    expect(nextState.pendingEvents).toHaveLength(2);
    expect(nextState.pendingEvents[0]).toEqual({ type: 'WaveStarted', wave: 3 });
    expect(nextState.pendingEvents[1]).toEqual({ type: 'EffectSpawned', effectId: 'fx-1' });
  });

  it('engine reducer applyTickResult applies patches while surfacing immediate events', () => {
    const startingState = applyEnginePatch(createInitialEngineState(), {
      pendingEvents: [{ type: 'MoneyAwarded', amount: 3 }],
      projectiles: [
        {
          id: 'projectile-1',
          origin: [0, 1, 0],
          targetId: 'enemy-1',
          speed: 10,
          progress: 0,
          damage: 5,
          color: '#fff',
        },
      ],
      idCounters: { enemy: 1, tower: 0, projectile: 1, effect: 0 },
    });

    const result: EngineTickResult = {
      patch: {
        projectiles: [],
        idCounters: { projectile: 2 },
      },
      events: {
        immediate: [{ type: 'LivesLost', amount: 1 }],
        deferred: [{ type: 'WaveStarted', wave: 2 }],
      },
    };

    const { state: nextState, immediateEvents } = engineReducer(startingState, {
      type: 'applyTickResult',
      result,
    });

    expect(immediateEvents).toEqual([
      { type: 'MoneyAwarded', amount: 3 },
      { type: 'LivesLost', amount: 1 },
    ]);
    expect(nextState.pendingEvents).toEqual([{ type: 'WaveStarted', wave: 2 }]);
    expect(nextState.projectiles).toHaveLength(0);
    expect(nextState.idCounters).toEqual({ enemy: 1, tower: 0, projectile: 2, effect: 0 });
  });
});

describe('effect lifecycle', () => {
  it('removes an effect by id without mutating the original state', () => {
    const initial = applyEnginePatch(createInitialEngineState(), {
      effects: [
        { id: 'fx-1', type: 'hit', position: [0, 0, 0] },
        { id: 'fx-2', type: 'spawn', position: [1, 0, 1] },
      ],
    });

    const next = removeEffectById(initial, 'fx-1');
    expect(next.effects).toHaveLength(1);
    expect(next.effects[0]?.id).toBe('fx-2');
    expect(initial.effects).toHaveLength(2);
  });

  it('engine reducer exposes a removeEffect action for renderer dispatch', () => {
    const initial = applyEnginePatch(createInitialEngineState(), {
      effects: [
        { id: 'fx-1', type: 'hit', position: [0, 0, 0] },
        { id: 'fx-2', type: 'spawn', position: [1, 0, 1] },
      ],
    });

    const { state: afterRemoval, immediateEvents } = engineReducer(initial, {
      type: 'removeEffect',
      effectId: 'fx-2',
    });

    expect(afterRemoval.effects.map((fx) => fx.id)).toEqual(['fx-1']);
    expect(immediateEvents).toEqual([]);
  });
});

describe('selectors keep math in grid space', () => {
  const waypoints: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
  ];

  it('derives enemy world positions without three.js', () => {
    const enemy: EngineEnemy = {
      id: 'enemy-1',
      type: 'basic',
      pathIndex: 0,
      progress: 0.5,
      hp: 10,
    };

    const position = selectEnemyWorldPosition(enemy, waypoints, 2);
    expect(position).toEqual([1, 1, 0]);
  });

  it('interpolates projectiles using enemy selectors', () => {
    const enemy: EngineEnemy = {
      id: 'enemy-2',
      type: 'basic',
      pathIndex: 1,
      progress: 0.25,
      hp: 10,
    };

    const projectile = {
      id: 'projectile-1',
      origin: [0, 1, 0] as [number, number, number],
      targetId: 'enemy-2',
      speed: 10,
      progress: 0.5,
      damage: 5,
      color: '#fff',
    };

    const position = selectProjectileWorldPosition(projectile, enemy, waypoints, 2);
    expect(position[0]).toBeCloseTo(1);
    expect(position[1]).toBeCloseTo(1);
    expect(position[2]).toBeCloseTo(0.25);
  });
});

describe('rng injection', () => {
  it('produces deterministic sequences for testing', () => {
    const rngA = createDeterministicRng(42);
    const rngB = createDeterministicRng(42);
    const sequenceA = [rngA(), rngA(), rngA()];
    const sequenceB = [rngB(), rngB(), rngB()];
    expect(sequenceA).toEqual(sequenceB);
  });
});

describe('event helpers', () => {
  it('merges multiple event arrays to simplify dispatch', () => {
    const combined = mergeEvents(
      [{ type: 'MoneyAwarded', amount: 1 }],
      [{ type: 'LivesLost', amount: 2 }],
      [],
    );
    expect(combined).toEqual([
      { type: 'MoneyAwarded', amount: 1 },
      { type: 'LivesLost', amount: 2 },
    ]);
  });
});

describe('runtime helpers', () => {
  it('applies tick results to engine and hydrates UI via immediate events', () => {
    const initial = {
      engine: applyEnginePatch(createInitialEngineState(), {
        pendingEvents: [{ type: 'MoneyAwarded', amount: 3 }],
        effects: [{ id: 'fx-1', type: 'hit', position: [0, 0, 0] }],
      }),
      ui: createInitialUiState(),
    };

    const result: EngineTickResult = {
      patch: { effects: [] },
      events: {
        immediate: [
          { type: 'LivesLost', amount: 1 },
          { type: 'EnemyKilled', enemyId: 'enemy-1', reward: 5 },
        ],
        deferred: [{ type: 'WaveStarted', wave: 4 }],
      },
    };

    const next = applyEngineRuntimeAction(initial, { type: 'applyTickResult', result });
    expect(next.engine.effects).toEqual([]);
    expect(next.engine.pendingEvents).toEqual([{ type: 'WaveStarted', wave: 4 }]);
    expect(next.ui.money).toBe(158);
    expect(next.ui.lives).toBe(19);
  });

  it('allows renderer intent to remove effects without changing UI', () => {
    const initial = {
      engine: applyEnginePatch(createInitialEngineState(), {
        effects: [
          { id: 'fx-1', type: 'hit', position: [0, 0, 0] },
          { id: 'fx-2', type: 'spawn', position: [1, 0, 1] },
        ],
      }),
      ui: createInitialUiState(),
    };

    const next = applyEngineRuntimeAction(initial, { type: 'removeEffect', effectId: 'fx-2' });
    expect(next.engine.effects.map((fx) => fx.id)).toEqual(['fx-1']);
    expect(next.ui).toBe(initial.ui);
  });

  it('skipWave zeroes the timer when the wave is preparing', () => {
    const initial = {
      engine: applyEnginePatch(createInitialEngineState(), {
        wave: {
          wave: 1,
          phase: 'preparing',
          enemiesRemainingToSpawn: 0,
          enemiesAlive: 0,
          timerMs: 5000,
          spawnIntervalMs: 2000,
        },
      }),
      ui: createInitialUiState(),
    };

    const next = applyEngineRuntimeAction(initial, { type: 'skipWave' });
    expect(next.engine.wave?.timerMs).toBe(0);
  });

  it('skipWave is a no-op outside of preparing phase', () => {
    const initial = {
      engine: applyEnginePatch(createInitialEngineState(), {
        wave: {
          wave: 1,
          phase: 'spawning',
          enemiesRemainingToSpawn: 1,
          enemiesAlive: 0,
          timerMs: 1000,
          spawnIntervalMs: 2000,
        },
      }),
      ui: createInitialUiState(),
    };

    const next = applyEngineRuntimeAction(initial, { type: 'skipWave' });
    expect(next).toBe(initial);
  });
});
