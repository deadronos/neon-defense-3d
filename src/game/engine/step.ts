import { stepEnemies } from './enemy';
import { mergeEvents } from './events';
import { stepProjectiles } from './projectile';
import { applyEnginePatch } from './state';
import { stepTowers } from './tower';
import type {
  EngineEvents,
  EnginePatch,
  EngineState,
  EngineTickContext,
  EngineTickResult,
  EngineVector2,
} from './types';
import { stepWave } from './wave';

export interface StepEngineOptions {
  greedMultiplier?: number;
  prepTimeMs?: number;
  tileSize?: number;
}

export const stepEngine = (
  state: EngineState,
  pathWaypoints: readonly EngineVector2[],
  context: EngineTickContext,
  options: StepEngineOptions = {},
): EngineTickResult => {
  const tileSize = options.tileSize;
  const waveResult = stepWave(state, pathWaypoints, context, { prepTimeMs: options.prepTimeMs });
  let workingState = applyEnginePatch(state, waveResult.patch);
  const patch: EnginePatch = { ...waveResult.patch };

  const enemyResult = stepEnemies(workingState, pathWaypoints, context, { tileSize });
  if (enemyResult.patch.enemies !== undefined) patch.enemies = enemyResult.patch.enemies;
  workingState = applyEnginePatch(workingState, enemyResult.patch);

  const towerResult = stepTowers(workingState, pathWaypoints, context, { tileSize });
  patch.towers = towerResult.patch.towers ?? patch.towers;
  patch.projectiles = towerResult.patch.projectiles ?? patch.projectiles;
  if (towerResult.patch.idCounters) {
    patch.idCounters = { ...(patch.idCounters ?? {}), ...towerResult.patch.idCounters };
  }
  workingState = applyEnginePatch(workingState, towerResult.patch);

  const projectileResult = stepProjectiles(workingState, pathWaypoints, context, {
    tileSize,
    greedMultiplier: options.greedMultiplier,
  });
  if (projectileResult.patch.enemies !== undefined) patch.enemies = projectileResult.patch.enemies;
  patch.projectiles = projectileResult.patch.projectiles ?? patch.projectiles;
  patch.effects = projectileResult.patch.effects ?? patch.effects;
  if (projectileResult.patch.idCounters) {
    patch.idCounters = { ...(patch.idCounters ?? {}), ...projectileResult.patch.idCounters };
  }
  workingState = applyEnginePatch(workingState, projectileResult.patch);

  const events: EngineEvents = {
    immediate: mergeEvents(
      waveResult.events.immediate,
      enemyResult.events.immediate,
      towerResult.events.immediate,
      projectileResult.events.immediate,
    ),
    deferred: mergeEvents(
      waveResult.events.deferred,
      enemyResult.events.deferred,
      towerResult.events.deferred,
      projectileResult.events.deferred,
    ),
  };

  if (workingState.wave !== null) {
    patch.wave = { ...workingState.wave, enemiesAlive: workingState.enemies.length };
  }

  return { patch, events };
};

// Explicit re-exports to aid test readability without widening public API surface elsewhere.
export type { EngineTickContext, EngineVector2 };
