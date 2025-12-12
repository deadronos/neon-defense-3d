import type { EngineEvent } from './events';
import { selectEnemyWorldPosition } from './selectors';
import type {
  EngineEffectIntent,
  EngineEnemy,
  EngineEvents,
  EnginePatch,
  EngineProjectile,
  EngineState,
  EngineTickContext,
  EngineTickResult,
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

export const stepProjectiles = (
  state: EngineState,
  pathWaypoints: readonly EngineVector2[],
  context: EngineTickContext,
  options: StepProjectilesOptions = {},
): EngineTickResult => {
  const tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
  const greedMultiplier = options.greedMultiplier ?? 1;
  const deltaSeconds = context.deltaMs / 1000;

  const events: EngineEvents = { immediate: [], deferred: [] };

  if (state.projectiles.length === 0) {
    return { patch: {}, events };
  }

  const hits = new Map<string, number>();
  let frameTotalDamage = 0;

  const activeProjectiles: EngineProjectile[] = [];

  for (const projectile of state.projectiles) {
    const target = state.enemies.find((enemy) => enemy.id === projectile.targetId);
    if (!target) continue;

    const nextProgress = projectile.progress + deltaSeconds * PROJECTILE_PROGRESS_RATE;
    if (nextProgress >= 1) {
      hits.set(projectile.targetId, (hits.get(projectile.targetId) ?? 0) + projectile.damage);
      frameTotalDamage += projectile.damage;
      continue;
    }

    activeProjectiles.push({ ...projectile, progress: nextProgress });
  }

  let nextEnemies: EngineEnemy[] = state.enemies;
  let nextEffects: EngineEffectIntent[] = state.effects;
  let nextEffectCounter = state.idCounters.effect;

  if (hits.size > 0) {
    const survivors: EngineEnemy[] = [];
    const newEffects: EngineEffectIntent[] = [];

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

        newEffects.push({
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

      survivors.push({ ...enemy, hp: remainingHp, shield: remainingShield });
    }

    nextEnemies = survivors;
    if (newEffects.length > 0) {
      nextEffects = [...state.effects, ...newEffects];
    }
  }

  const patch: EnginePatch = {
    projectiles: activeProjectiles,
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
