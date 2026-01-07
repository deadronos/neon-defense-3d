/**
 * Entity transformation functions to convert engine state to UI entities.
 * Extracted from GameState.tsx for better modularity.
 */
import { ENEMY_TYPES, TILE_SIZE } from '../constants';
import type {
  EffectEntity,
  EnemyConfig,
  EnemyEntity,
  ProjectileEntity,
  TowerEntity,
  TowerType,
  WaveState,
} from '../types';

import { selectEnemyWorldPosition, selectProjectileWorldPosition } from './engine/selectors';
import type { EngineEnemy, EngineState, EngineVector2 } from './engine/types';

/**
 * Builds a Map of enemy type names to their configurations.
 */
export const buildEnemyTypeMap = (): Map<string, EnemyConfig> => {
  const map = new Map<string, EnemyConfig>();
  for (const config of Object.values(ENEMY_TYPES)) {
    map.set(config.name, {
      speed: config.speed,
      hp: config.hpBase,
      shield: config.shield,
      reward: config.reward,
      color: config.color,
      scale: config.scale,
      abilities: config.abilities,
    });
  }
  return map;
};

/**
 * Converts engine wave state to UI wave state.
 */
export const toWaveState = (engineWave: EngineState['wave']): WaveState | null => {
  if (!engineWave) return null;
  return {
    wave: engineWave.wave,
    phase: engineWave.phase,
    nextWaveTime: 0,
    enemiesAlive: engineWave.enemiesAlive,
    enemiesRemainingToSpawn: engineWave.enemiesRemainingToSpawn,
    timer: engineWave.timerMs / 1000,
  };
};

/**
 * Converts an engine enemy to a UI enemy entity.
 */
/* eslint-disable complexity */
export const toEnemyEntity = (
  enemy: EngineEnemy,
  enemyTypeMap: Map<string, EnemyConfig>,
  pathWaypoints: readonly EngineVector2[],
): EnemyEntity => {
  const baseConfig = enemyTypeMap.get(enemy.type);
  const config: EnemyConfig = {
    speed: enemy.speed ?? baseConfig?.speed ?? 0,
    hp: enemy.hp,
    shield: enemy.shield ?? baseConfig?.shield ?? 0,
    reward: enemy.reward ?? baseConfig?.reward ?? 0,
    color: enemy.color ?? baseConfig?.color ?? '#ffffff',
    scale: enemy.scale ?? baseConfig?.scale,
    abilities: baseConfig?.abilities,
  };

  const pos = selectEnemyWorldPosition(enemy, pathWaypoints, TILE_SIZE);

  return {
    id: enemy.id,
    config,
    pathIndex: enemy.pathIndex,
    progress: enemy.progress,
    position: pos,
    hp: enemy.hp,
    shield: enemy.shield ?? 0,
    maxShield: enemy.maxShield ?? enemy.shield ?? 0,
    frozen: enemy.frozen ?? 0,
    abilityCooldown: enemy.abilityCooldown ?? 0,
    abilityActiveTimer: enemy.abilityActiveTimer ?? 0,
  };
};
/* eslint-enable complexity */

/**
 * Converts an engine projectile to a UI projectile entity.
 */
export const toProjectileEntity = (
  projectile: EngineState['projectiles'][number],
  enemiesById: Map<string, EngineEnemy>,
  pathWaypoints: readonly EngineVector2[],
): ProjectileEntity => {
  const target = enemiesById.get(projectile.targetId);
  const pos = selectProjectileWorldPosition(projectile, target, pathWaypoints, TILE_SIZE);
  return {
    id: projectile.id,
    startPos: projectile.origin,
    position: pos,
    targetId: projectile.targetId,
    speed: projectile.speed,
    progress: projectile.progress,
    damage: projectile.damage,
    color: projectile.color,
  };
};

/**
 * Converts an engine effect to a UI effect entity.
 */
export const toEffectEntity = (effect: EngineState['effects'][number]): EffectEntity => ({
  id: effect.id,
  type: effect.type,
  position: effect.position,
  color: effect.color,
  scale: effect.scale,
  duration: effect.duration,
  createdAt: effect.createdAt,
});

/**
 * Converts an engine tower to a UI tower entity.
 */
export const toTowerEntity = (tower: EngineState['towers'][number]): TowerEntity => ({
  id: tower.id,
  type: tower.type as TowerType,
  gridPos: [tower.gridPosition[0], tower.gridPosition[1]],
  position: [tower.gridPosition[0] * TILE_SIZE, 0.5, tower.gridPosition[1] * TILE_SIZE],
  lastFired: tower.lastFired,
  targetId: tower.targetId ?? null,
  level: tower.level,
});
