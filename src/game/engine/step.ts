import { mergeEvents } from './events';
import { stepEnemies } from './enemy';
import type {
  EngineEvents,
  EnginePatch,
  EngineState,
  EngineTickContext,
  EngineTickResult,
  EngineVector2,
} from './types';
import { applyEnginePatch } from './state';
import { stepWave } from './wave';

export interface StepEngineOptions {
  prepTimeMs?: number;
  tileSize?: number;
}

export const stepEngine = (
  state: EngineState,
  pathWaypoints: EngineVector2[],
  context: EngineTickContext,
  options: StepEngineOptions = {},
): EngineTickResult => {
  const waveResult = stepWave(state, pathWaypoints, context, { prepTimeMs: options.prepTimeMs });
  const afterWaveState = applyEnginePatch(state, waveResult.patch);

  const enemyResult = stepEnemies(afterWaveState, pathWaypoints, context, { tileSize: options.tileSize });
  const finalEnemies = enemyResult.patch.enemies ?? afterWaveState.enemies;

  const events: EngineEvents = {
    immediate: mergeEvents(waveResult.events.immediate, enemyResult.events.immediate),
    deferred: mergeEvents(waveResult.events.deferred, enemyResult.events.deferred),
  };

  const patch: EnginePatch = {
    ...waveResult.patch,
    ...enemyResult.patch,
    wave:
      afterWaveState.wave !== null
        ? {
            ...afterWaveState.wave,
            enemiesAlive: finalEnemies.length,
          }
        : waveResult.patch.wave,
  };

  return { patch, events };
};

// Explicit re-exports to aid test readability without widening public API surface elsewhere.
export type { EngineTickContext, EngineVector2 };
