import type { EngineEvent } from './events';
import type { EngineCache } from './step';
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

/** Speed multiplier when an enemy is frozen (50% speed). */
const FROZEN_SPEED_MULTIPLIER = 0.5;
/** Speed multiplier during dash ability (3x normal speed). */
const DASH_SPEED_MULTIPLIER = 3;
/** Duration of the dash ability in seconds. */
const DASH_DURATION_SECONDS = 0.5;
/** Cooldown between enemy dash abilities in seconds. */
const DASH_COOLDOWN_SECONDS = 4;

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

  let segmentLengths: number[] | undefined;
  if (cache) {
    // ... cache logic
    const needsRefresh =
      cache.pathWaypointsRef !== pathWaypoints ||
      cache.pathTileSize !== tileSize ||
      cache.pathSegmentLengths.length !== Math.max(0, pathWaypoints.length - 1);

    if (needsRefresh) {
      cache.pathSegmentLengths.length = 0;
      for (let i = 0; i < pathWaypoints.length - 1; i += 1) {
        const p1 = pathWaypoints[i];
        const p2 = pathWaypoints[i + 1];
        const segmentLength = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * tileSize;
        cache.pathSegmentLengths.push(segmentLength);
      }
      cache.pathWaypointsRef = pathWaypoints;
      cache.pathTileSize = tileSize;
    }

    segmentLengths = cache.pathSegmentLengths;
  }

  let livesLost = 0;

  for (const enemy of state.enemies) {
    let currentSpeed = enemy.speed ?? 0;

    let nextFrozen = enemy.frozen ?? 0;
    if (nextFrozen > 0) {
      currentSpeed *= FROZEN_SPEED_MULTIPLIER;
      nextFrozen = Math.max(0, nextFrozen - deltaSeconds);
    }

    const hasDashAbility =
      enemy.abilityCooldown !== undefined || enemy.abilityActiveTimer !== undefined;
    const abilityActiveTimer = enemy.abilityActiveTimer ?? 0;
    const abilityCooldown = enemy.abilityCooldown ?? 0;

    let nextActiveTimer = abilityActiveTimer;
    let nextCooldown = abilityCooldown;

    if (hasDashAbility) {
      if (abilityActiveTimer > 0) {
        nextActiveTimer = Math.max(0, abilityActiveTimer - deltaSeconds);
        currentSpeed *= DASH_SPEED_MULTIPLIER;
      } else {
        nextCooldown = abilityCooldown - deltaSeconds;
        if (nextCooldown <= 0) {
          nextActiveTimer = DASH_DURATION_SECONDS;
          nextCooldown = DASH_COOLDOWN_SECONDS;
        }
      }
    }

    const p1 = pathWaypoints[enemy.pathIndex];
    const p2 = pathWaypoints[enemy.pathIndex + 1];
    if (!p1 || !p2) {
      livesLost += 1;
      continue;
    }

    let searchIndex = enemy.pathIndex;
    let searchProgress = enemy.progress;
    let distanceRemaining = currentSpeed * deltaSeconds;
    let hasLeaked = false;

    // Safety break to prevent infinite loops in case of zero-length segments or massive deltas
    let loops = 0;
    while (distanceRemaining > 0 && loops < 20) {
      loops++;
      const s1 = pathWaypoints[searchIndex];
      const s2 = pathWaypoints[searchIndex + 1];
      if (!s1 || !s2) {
        // End of path (should have been caught by nextPathIndex check below, but safety)
        hasLeaked = true;
        distanceRemaining = 0;
        break;
      }

      const segLen =
        segmentLengths?.[searchIndex] ?? Math.hypot(s2[0] - s1[0], s2[1] - s1[1]) * tileSize;

      if (segLen <= 0.0001) {
        // ...
        searchIndex++;
        if (searchIndex >= pathWaypoints.length - 1) {
          hasLeaked = true;
          distanceRemaining = 0;
        }
        continue;
      }

      const distanceToNext = (1 - searchProgress) * segLen;

      if (distanceRemaining >= distanceToNext) {
        // Complete this segment
        distanceRemaining -= distanceToNext;
        searchProgress = 0;
        searchIndex++;
        if (searchIndex >= pathWaypoints.length - 1) {
          hasLeaked = true;
          distanceRemaining = 0; // Leaked
        }
      } else {
        // Finish on this segment
        searchProgress += distanceRemaining / segLen;
        distanceRemaining = 0;
      }
    }

    if (hasLeaked) {
      livesLost += 1;
      continue;
    }

    nextEnemies.push({
      ...enemy,
      pathIndex: searchIndex,
      progress: searchProgress,
      frozen: nextFrozen,
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
