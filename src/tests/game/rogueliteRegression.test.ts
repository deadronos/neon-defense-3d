// @vitest-environment node

import { expect, it } from 'vitest';

import { INITIAL_PATH } from '../../constants';
import { applyEnginePatch, createInitialEngineState } from '../../game/engine/state';
import { createInitialUiState, uiReducer } from '../../game/engine/uiReducer';
import { stepWave } from '../../game/engine/wave';
import {
  buildRuntimeFromCheckpoint,
  migrateSave,
  serializeCheckpoint,
  validateSave,
} from '../../game/persistence';

it('keeps Roguelite playing after Wave 10', () => {
  const ui = uiReducer(createInitialUiState(), { type: 'startRogueliteRun', seed: 'test' });
  const next = uiReducer(ui, {
    type: 'applyEngineEvents',
    events: [{ type: 'WaveCompleted', wave: 10 }],
  });
  expect(next.gameStatus).toBe('playing');
});

it('round-trips a procedural checkpoint through migration', () => {
  const ui = {
    ...uiReducer(createInitialUiState(), { type: 'startRogueliteRun', seed: 'test' }),
    roguePhase: 2,
  };
  const save = serializeCheckpoint(ui, createInitialEngineState());
  expect(validateSave(save).ok).toBe(true);
  const migrated = migrateSave(save);
  expect(migrated.save).toBeDefined();
  expect(buildRuntimeFromCheckpoint(migrated.save!, createInitialUiState()).ui).toMatchObject({
    currentMapIndex: -1,
    gameMode: 'ROGUELITE',
    customMapSeed: 'test',
    roguePhase: 2,
  });
});

it('increases enemy HP in later Roguelite phases', () => {
  const state = createInitialEngineState();
  const context = { nowMs: 0, deltaMs: 5000, rng: () => 0 };
  const started = stepWave(state, INITIAL_PATH, context);
  const spawning = applyEnginePatch(state, started.patch);
  const first = stepWave(spawning, INITIAL_PATH, context);
  const later = stepWave(spawning, INITIAL_PATH, context, { roguePhase: 2 });
  expect(later.patch.enemies![0].hp).toBeGreaterThan(first.patch.enemies![0].hp);
});

it('rejects malformed procedural layouts during validation and migration', () => {
  const ui = uiReducer(createInitialUiState(), { type: 'startRogueliteRun', seed: 'test' });
  const save = serializeCheckpoint(ui, createInitialEngineState());
  save.ui.customMapLayout = [[2, 3]];
  expect(validateSave(save).ok).toBe(false);
  expect(migrateSave(save).ok).toBe(false);
});
