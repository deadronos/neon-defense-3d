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

const getOrUpdateSegmentLengths = (
  cache: EngineCache,
  pathWaypoints: readonly EngineVector2[],
  tileSize: number,
): number[] => {
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

  return cache.pathSegmentLengths;
};

const applyEnemyStatusAndAbility = (
  enemy: EngineEnemy,
  deltaSeconds: number,
): {
  speed: number;
  frozen: number;
  hasDashAbility: boolean;
  abilityActiveTimer?: number;
  abilityCooldown?: number;
} => {
  let speed = enemy.speed ?? 0;

  let frozen = enemy.frozen ?? 0;
  if (frozen > 0) {
    speed *= FROZEN_SPEED_MULTIPLIER;
    frozen = Math.max(0, frozen - deltaSeconds);
  }

  const hasDashAbility =
    enemy.abilityCooldown !== undefined || enemy.abilityActiveTimer !== undefined;
  if (!hasDashAbility) return { speed, frozen, hasDashAbility: false };

  const abilityActiveTimer = enemy.abilityActiveTimer ?? 0;
  const abilityCooldown = enemy.abilityCooldown ?? 0;

  if (abilityActiveTimer > 0) {
    return {
      speed: speed * DASH_SPEED_MULTIPLIER,
      frozen,
      hasDashAbility: true,
      abilityActiveTimer: Math.max(0, abilityActiveTimer - deltaSeconds),
      abilityCooldown,
    };
  }

  const nextCooldown = abilityCooldown - deltaSeconds;
  if (nextCooldown <= 0) {
    return {
      speed,
      frozen,
      hasDashAbility: true,
      abilityActiveTimer: DASH_DURATION_SECONDS,
      abilityCooldown: DASH_COOLDOWN_SECONDS,
    };
  }

  return {
    speed,
    frozen,
    hasDashAbility: true,
    abilityActiveTimer: 0,
    abilityCooldown: nextCooldown,
  };
};

const advanceAlongPath = (params: {
  pathWaypoints: readonly EngineVector2[];
  segmentLengths: number[] | undefined;
  tileSize: number;
  pathIndex: number;
  progress: number;
  distance: number;
}): { pathIndex: number; progress: number; leaked: boolean } => {
  const { pathWaypoints, segmentLengths, tileSize } = params;

  let searchIndex = params.pathIndex;
  let searchProgress = params.progress;
  let distanceRemaining = params.distance;

  // Safety break to prevent infinite loops in case of zero-length segments or massive deltas
  let loops = 0;
  while (distanceRemaining > 0 && loops < 20) {
    loops += 1;

    const s1 = pathWaypoints.at(searchIndex);
    const s2 = pathWaypoints.at(searchIndex + 1);
    if (s1 === undefined || s2 === undefined) {
      return { pathIndex: searchIndex, progress: searchProgress, leaked: true };
    }

    const cachedLength = segmentLengths?.at(searchIndex);
    const segLen = cachedLength ?? Math.hypot(s2[0] - s1[0], s2[1] - s1[1]) * tileSize;

    if (segLen <= 0.0001) {
      searchIndex += 1;
      searchProgress = 0;
      if (searchIndex >= pathWaypoints.length - 1) {
        return { pathIndex: searchIndex, progress: searchProgress, leaked: true };
      }
      continue;
    }

    const distanceToNext = (1 - searchProgress) * segLen;

    if (distanceRemaining >= distanceToNext) {
      distanceRemaining -= distanceToNext;
      searchProgress = 0;
      searchIndex += 1;
      if (searchIndex >= pathWaypoints.length - 1) {
        return { pathIndex: searchIndex, progress: searchProgress, leaked: true };
      }
      continue;
    }

    searchProgress += distanceRemaining / segLen;
    distanceRemaining = 0;
  }

  return { pathIndex: searchIndex, progress: searchProgress, leaked: false };
};

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

  const segmentLengths = cache
    ? getOrUpdateSegmentLengths(cache, pathWaypoints, tileSize)
    : undefined;

  let livesLost = 0;

  for (const enemy of state.enemies) {
    const status = applyEnemyStatusAndAbility(enemy, deltaSeconds);
    const movement = advanceAlongPath({
      pathWaypoints,
      segmentLengths,
      tileSize,
      pathIndex: enemy.pathIndex,
      progress: enemy.progress,
      distance: status.speed * deltaSeconds,
    });

    if (movement.leaked) {
      livesLost += 1;
      continue;
    }

    nextEnemies.push({
      ...enemy,
      pathIndex: movement.pathIndex,
      progress: movement.progress,
      frozen: status.frozen,
      abilityActiveTimer: status.hasDashAbility ? status.abilityActiveTimer : undefined,
      abilityCooldown: status.hasDashAbility ? status.abilityCooldown : undefined,
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
