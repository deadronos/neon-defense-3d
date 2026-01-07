import type { EngineEvent } from './events';
import { createExplosionEffect } from './projectile/effects';
import { addHit, applyFreeze } from './projectile/hitResolution';
import type { ImpactContext } from './projectile/impactSearch';
import { ensureEnemyPosition, findTargetsInSplash } from './projectile/impactSearch';
import type { EngineCache } from './step';
import type {
  EngineEffectIntent,
  EngineEnemy,
  EngineEvents,
  EnginePatch,
  EngineState,
  EngineTickContext,
  EngineTickResult,
  EngineMutableVector3,
  EngineVector2,
} from './types';

export interface StepProjectilesOptions {
  greedMultiplier?: number;
  tileSize?: number;
}

const DEFAULT_TILE_SIZE = 2;
const PROJECTILE_PROGRESS_RATE = 3; // Matches legacy behavior: progress += deltaSeconds * 3
const EFFECT_DURATION_SECONDS = 0.8;
const DEFAULT_EFFECT_SCALE = 0.4;

/* eslint-disable sonarjs/cognitive-complexity, complexity */
export const stepProjectiles = (
  state: EngineState,
  pathWaypoints: readonly EngineVector2[],
  context: EngineTickContext,
  options: StepProjectilesOptions = {},
  cache?: EngineCache,
): EngineTickResult => {
  const tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
  const greedMultiplier = options.greedMultiplier ?? 1;
  const deltaSeconds = context.deltaMs / 1000;

  const events: EngineEvents = { immediate: [], deferred: [] };

  if (state.projectiles.length === 0) {
    return { patch: {}, events };
  }

  // Reuse or create structures
  const hits = cache ? cache.projectileHits : new Map<string, number>();
  if (cache) hits.clear();

  const freezeHits = cache ? cache.projectileFreeze : new Map<string, number>();
  if (cache) freezeHits.clear();

  const activeProjectiles = cache ? cache.activeProjectiles : [];
  if (cache) activeProjectiles.length = 0;

  let frameTotalDamage = 0;
  let nextEffectCounter = state.idCounters.effect;
  const addedEffects: EngineEffectIntent[] = [];

  const enemiesById = cache ? cache.enemiesById : new Map<string, EngineEnemy>();
  if (cache) enemiesById.clear();

  // Cache enemy positions for splash checks and effects.
  const enemyPositions = cache ? cache.enemyPositions : new Map<string, EngineMutableVector3>();
  const enemyPositionPool = cache ? cache.enemyPositionPool : [];
  const positionsFromCache = cache?.enemyPositionsSource === state.enemies;
  if (cache && !positionsFromCache) {
    for (const position of enemyPositions.values()) {
      enemyPositionPool.push(position);
    }
    enemyPositions.clear();
    cache.enemyPositionsSource = undefined;
  }

  // Build context for impact search
  const impactContext: ImpactContext = {
    enemyPositions,
    enemyPositionPool,
    spatialGrid: cache?.spatialGrid,
    pathWaypoints,
    tileSize,
  };

  for (const enemy of state.enemies) {
    enemiesById.set(enemy.id, enemy);
  }

  for (const projectile of state.projectiles) {
    const target = enemiesById.get(projectile.targetId);
    if (!target) continue;

    const nextProgress = projectile.progress + deltaSeconds * PROJECTILE_PROGRESS_RATE;
    if (nextProgress >= 1) {
      if (projectile.splashRadius != null && projectile.splashRadius > 0) {
        // We can look up the target position directly if it exists, otherwise compute it.
        const impactPos =
          enemyPositions.get(target.id) ?? ensureEnemyPosition(target, impactContext);

        // Visual Effect for AOE Impact
        const explosion = createExplosionEffect(
          nextEffectCounter,
          impactPos,
          projectile.color,
          projectile.splashRadius,
          context.nowMs / 1000,
          0.5,
        );
        nextEffectCounter = explosion.newCounter;
        addedEffects.push(explosion.effect);

        findTargetsInSplash(
          impactPos,
          projectile.splashRadius,
          state.enemies,
          impactContext,
          (enemy) => {
            addHit(hits, enemy.id, projectile.damage);
            applyFreeze(freezeHits, enemy.id, projectile.freezeDuration);
            frameTotalDamage += projectile.damage;
          },
        );
      } else {
        addHit(hits, projectile.targetId, projectile.damage);
        applyFreeze(freezeHits, projectile.targetId, projectile.freezeDuration);
        frameTotalDamage += projectile.damage;
      }
      continue;
    }

    activeProjectiles.push({ ...projectile, progress: nextProgress });
  }

  let nextEnemies: EngineEnemy[] = state.enemies;
  let nextEffects: EngineEffectIntent[] = state.effects;

  if (hits.size > 0) {
    const survivors: EngineEnemy[] = [];

    for (const enemy of state.enemies) {
      const damage = hits.get(enemy.id) ?? 0;
      if (damage <= 0) {
        survivors.push(enemy);
        continue;
      }

      const currentShield = enemy.shield ?? 0;
      const shieldDamage = Math.min(currentShield, damage);
      const hpDamage = damage - shieldDamage;

      const remainingShield = currentShield - shieldDamage;
      const remainingHp = enemy.hp - hpDamage;

      const addedFreeze = freezeHits.get(enemy.id);
      const frozenValue = enemy.frozen ?? 0;
      const nextFrozen =
        addedFreeze !== undefined ? Math.max(frozenValue, addedFreeze) : frozenValue;

      if (remainingHp <= 0) {
        const reward = Math.floor((enemy.reward ?? 0) * greedMultiplier);
        const killedEvent: EngineEvent = {
          type: 'EnemyKilled',
          enemyId: enemy.id,
          reward,
        };
        events.deferred.push(killedEvent);

        const position = enemyPositions.get(enemy.id) ?? ensureEnemyPosition(enemy, impactContext);

        const explosion = createExplosionEffect(
          nextEffectCounter,
          position,
          enemy.color,
          enemy.scale ?? DEFAULT_EFFECT_SCALE,
          context.nowMs / 1000,
          EFFECT_DURATION_SECONDS,
        );
        nextEffectCounter = explosion.newCounter;
        addedEffects.push(explosion.effect);

        continue;
      }

      survivors.push({ ...enemy, hp: remainingHp, shield: remainingShield, frozen: nextFrozen });
    }

    nextEnemies = survivors;
  }

  if (addedEffects.length > 0) {
    nextEffects = [...state.effects, ...addedEffects];
  }

  const patch: EnginePatch = {
    projectiles: cache ? activeProjectiles.slice() : activeProjectiles,
    enemies: hits.size > 0 ? nextEnemies : undefined,
    effects: nextEffects !== state.effects ? nextEffects : undefined,
    idCounters:
      nextEffectCounter !== state.idCounters.effect ? { effect: nextEffectCounter } : undefined,
  };

  if (frameTotalDamage > 0) {
    events.deferred.push({ type: 'DamageDealt', amount: frameTotalDamage });
  }

  return { patch, events };
};
/* eslint-enable sonarjs/cognitive-complexity, complexity */
