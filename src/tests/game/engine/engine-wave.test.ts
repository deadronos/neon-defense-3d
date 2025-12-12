import { describe, expect, it } from 'vitest';

import { createDeterministicRng } from '../../../game/engine/rng';
import { applyEnginePatch, createInitialEngineState } from '../../../game/engine/state';
import { stepWave } from '../../../game/engine/wave';
import type { EngineTickContext } from '../../../game/engine/types';

const makeContext = (deltaMs: number): EngineTickContext => ({
  deltaMs,
  nowMs: 0,
  rng: createDeterministicRng(7),
});

const path: [number, number][] = [
  [0, 0],
  [1, 0],
];

describe('engine wave prep and start', () => {
  it('counts down prep time then starts the first wave with a WaveStarted event', () => {
    const initial = createInitialEngineState();
    const result = stepWave(initial, path, makeContext(5000));

    expect(result.events.immediate).toEqual([{ type: 'WaveStarted', wave: 1 }]);
    expect(result.patch.wave?.phase).toBe('spawning');
    expect(result.patch.wave?.timerMs).toBe(1900);
    expect(result.patch.wave?.enemiesRemainingToSpawn).toBe(6);
  });
});

describe('engine wave spawning', () => {
  it('spawns enemies on interval using deterministic rng and increments id counters', () => {
    let engine = createInitialEngineState();
    const startResult = stepWave(engine, path, makeContext(5000));
    engine = applyEnginePatch(engine, startResult.patch);

    const spawnResult = stepWave(engine, path, makeContext(1900));

    expect(spawnResult.patch.enemies?.length).toBe(1);
    const spawned = spawnResult.patch.enemies?.[0];
    expect(spawned?.id).toBe('enemy-1');
    expect(spawned?.type).toBe('Drone');
    expect(spawned?.hp).toBeCloseTo(50);
    expect(spawned?.reward).toBe(12);
    expect(spawnResult.patch.idCounters?.enemy).toBe(1);
    expect(spawnResult.patch.wave?.enemiesRemainingToSpawn).toBe(5);
    expect(spawnResult.patch.wave?.phase).toBe('spawning');
  });
});

describe('engine wave completion', () => {
  it('transitions to preparing after active waves end with no enemies alive', () => {
    const state = applyEnginePatch(createInitialEngineState(), {
      wave: {
        wave: 1,
        phase: 'active',
        enemiesRemainingToSpawn: 0,
        enemiesAlive: 0,
        timerMs: 0,
        spawnIntervalMs: 1000,
      },
    });

    const result = stepWave(state, path, makeContext(100));

    expect(result.patch.wave?.phase).toBe('preparing');
    expect(result.patch.wave?.timerMs).toBe(4900);
  });
});
