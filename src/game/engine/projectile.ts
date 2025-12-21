import type { EngineEvent } from './events';
import { selectEnemyWorldPosition } from './selectors';
import type { EngineCache } from './step';
import type {
  EngineEffectIntent,
  EngineEnemy,
  EngineEvents,
  EnginePatch,
  EngineState,
  EngineTickContext,
  EngineTickResult,
  EngineVector2,
  EngineVector3,
} from './types';

const distance = (a: EngineVector3, b: EngineVector3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export interface StepProjectilesOptions {
  greedMultiplier?: number;
  tileSize?: number;
}

const DEFAULT_TILE_SIZE = 2;
const PROJECTILE_PROGRESS_RATE = 3; // Matches legacy behavior: progress += deltaSeconds * 3
const EFFECT_DURATION_SECONDS = 0.8;
const DEFAULT_EFFECT_SCALE = 0.4;

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
  if (cache) activeProjectiles.length = 0; // Clear array

  let frameTotalDamage = 0;
  let nextEffectCounter = state.idCounters.effect;
  const addedEffects: EngineEffectIntent[] = [];

  const enemiesById = cache ? cache.enemiesById : new Map<string, EngineEnemy>();
  if (cache) enemiesById.clear();

  for (const enemy of state.enemies) {
    enemiesById.set(enemy.id, enemy);
  }

  for (const projectile of state.projectiles) {
    const target = enemiesById.get(projectile.targetId);
    if (!target) continue;

    const nextProgress = projectile.progress + deltaSeconds * PROJECTILE_PROGRESS_RATE;
    if (nextProgress >= 1) {
      if (projectile.splashRadius) {
        const impactPos = selectEnemyWorldPosition(target, pathWaypoints, tileSize);

        // Visual Effect for AOE Impact
        nextEffectCounter += 1;
        addedEffects.push({
          id: `effect-${nextEffectCounter}`,
          type: 'explosion',
          position: impactPos,
          color: projectile.color,
          scale: projectile.splashRadius,
          createdAt: context.nowMs / 1000,
          duration: 0.5,
        });

        for (const enemy of state.enemies) {
          const enemyPos = selectEnemyWorldPosition(enemy, pathWaypoints, tileSize);
          if (distance(impactPos, enemyPos) <= projectile.splashRadius) {
            hits.set(enemy.id, (hits.get(enemy.id) ?? 0) + projectile.damage);
            if (projectile.freezeDuration) {
              const current = freezeHits.get(enemy.id) ?? 0;
              freezeHits.set(enemy.id, Math.max(current, projectile.freezeDuration));
            }
            frameTotalDamage += projectile.damage;
          }
        }
      } else {
        hits.set(projectile.targetId, (hits.get(projectile.targetId) ?? 0) + projectile.damage);
        if (projectile.freezeDuration) {
          const current = freezeHits.get(projectile.targetId) ?? 0;
          freezeHits.set(projectile.targetId, Math.max(current, projectile.freezeDuration));
        }
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
      const nextFrozen = addedFreeze ? Math.max(frozenValue, addedFreeze) : frozenValue;

      if (remainingHp <= 0) {
        const reward = Math.floor((enemy.reward ?? 0) * greedMultiplier);
        const killedEvent: EngineEvent = {
          type: 'EnemyKilled',
          enemyId: enemy.id,
          reward,
        };
        events.deferred.push(killedEvent);

        nextEffectCounter += 1;
        const effectId = `effect-${nextEffectCounter}`;
        const position = selectEnemyWorldPosition(enemy, pathWaypoints, tileSize);

        addedEffects.push({
          id: effectId,
          type: 'explosion',
          position,
          color: enemy.color,
          scale: enemy.scale ?? DEFAULT_EFFECT_SCALE,
          createdAt: context.nowMs / 1000,
          duration: EFFECT_DURATION_SECONDS,
        });
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
