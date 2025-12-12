import { describe, expect, it } from 'vitest';

import { createDeterministicRng } from '../../../game/engine/rng';
import { applyEnginePatch, createInitialEngineState } from '../../../game/engine/state';
import { stepEngine } from '../../../game/engine/step';

const path = [
  [0, 0],
  [1, 0],
] as const;

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
        },
      ],
    });

    const context = { deltaMs: 5000, nowMs: 0, rng: createDeterministicRng(2) };
    const result = stepEngine(state, path, context);

    expect(result.events.immediate).toEqual([
      { type: 'WaveStarted', wave: 1 },
      { type: 'LivesLost', amount: 1, source: 'enemy-leak' },
    ]);
    expect(result.patch.wave?.enemiesAlive).toBe(0);
    expect(result.patch.enemies).toEqual([]);
  });
});

