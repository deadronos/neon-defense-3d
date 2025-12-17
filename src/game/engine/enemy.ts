import type { EngineCache } from './step';
import type { EngineEvent } from './events';
import type {
  EngineEnemy,
  EngineEvents,
  EnginePatch,
  EngineState,
  EngineTickContext,
  EngineTickResult,
  EngineVector2,
} from './types';

export interface StepEnemiesOptions {
  tileSize?: number;
}

const DEFAULT_TILE_SIZE = 2;

export const stepEnemies = (
  state: EngineState,
  pathWaypoints: readonly EngineVector2[],
  context: EngineTickContext,
  options: StepEnemiesOptions = {},
  cache?: EngineCache,
): EngineTickResult => {
  const tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
  const deltaSeconds = context.deltaMs / 1000;

  const events: EngineEvents = { immediate: [], deferred: [] };
  const nextEnemies: EngineEnemy[] = cache ? cache.nextEnemies : [];
  if (cache) nextEnemies.length = 0;

  let livesLost = 0;

  for (const enemy of state.enemies) {
    let currentSpeed = enemy.speed ?? 0;
    const hasDashAbility =
      enemy.abilityCooldown !== undefined || enemy.abilityActiveTimer !== undefined;
    const abilityActiveTimer = enemy.abilityActiveTimer ?? 0;
    const abilityCooldown = enemy.abilityCooldown ?? 0;

    let nextActiveTimer = abilityActiveTimer;
    let nextCooldown = abilityCooldown;

    if (hasDashAbility) {
      if (abilityActiveTimer > 0) {
        nextActiveTimer = Math.max(0, abilityActiveTimer - deltaSeconds);
        currentSpeed *= 3;
      } else {
        nextCooldown = abilityCooldown - deltaSeconds;
        if (nextCooldown <= 0) {
          nextActiveTimer = 0.5;
          nextCooldown = 4;
        }
      }
    }

    const p1 = pathWaypoints[enemy.pathIndex];
    const p2 = pathWaypoints[enemy.pathIndex + 1];
    if (!p1 || !p2) {
      livesLost += 1;
      continue;
    }

    const segmentLength = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * tileSize;
    const progressDelta = segmentLength > 0 ? (currentSpeed * deltaSeconds) / segmentLength : 0;
    let nextProgress = enemy.progress + progressDelta;
    let nextPathIndex = enemy.pathIndex;

    if (nextProgress >= 1) {
      nextProgress = 0;
      nextPathIndex += 1;
      if (nextPathIndex >= pathWaypoints.length - 1) {
        livesLost += 1;
        continue;
      }
    }

    nextEnemies.push({
      ...enemy,
      pathIndex: nextPathIndex,
      progress: nextProgress,
      abilityActiveTimer: hasDashAbility ? nextActiveTimer : undefined,
      abilityCooldown: hasDashAbility ? nextCooldown : undefined,
    });
  }

  if (livesLost > 0) {
    const lifeLossEvent: EngineEvent = {
      type: 'LivesLost',
      amount: livesLost,
      source: 'enemy-leak',
    };
    events.immediate.push(lifeLossEvent);
  }

  const patch: EnginePatch = { enemies: cache ? nextEnemies.slice() : nextEnemies };

  return { patch, events };
};
