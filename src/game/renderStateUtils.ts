import type {
  EffectEntity,
  EnemyEntity,
  ProjectileEntity,
  TowerEntity,
  EnemyConfig,
  TowerType,
  Position3,
} from '../types';
import { gridKey } from '../utils/gridKey';
import { lerp } from '../utils/math';

import { selectEnemyWorldPosition } from './engine/selectors';
import type { EngineState, EngineVector2 } from './engine/types';

/**
 * Mutable container for the latest render-ready state.
 * This object is updated every tick without triggering React renders for the data arrays.
 */
export interface RenderState {
  enemies: EnemyEntity[];
  towers: TowerEntity[];
  projectiles: ProjectileEntity[];
  effects: EffectEntity[];

  /** Map of enemy ID to EnemyEntity for quick lookup by projectiles/towers. */
  enemiesById: Map<string, EnemyEntity>;

  /** Map of "x,z" grid coordinates to TowerEntity for O(1) placement/selection checks. */
  gridOccupancy: Map<string, TowerEntity>;

  /** Previous frame positions for interpolation (enemy id -> position). */
  previousEnemyPositions: Map<string, Position3>;
  /** Previous frame positions for interpolation (projectile id -> position). */
  previousProjectilePositions: Map<string, Position3>;
  /** Last known projectile positions for interpolation. */
  projectilePositions: Map<string, Position3>;
  /** Render interpolation alpha (0-1). */
  renderAlpha: number;
}

export const createInitialRenderState = (): RenderState => ({
  enemies: [],
  towers: [],
  projectiles: [],
  effects: [],
  enemiesById: new Map(),
  gridOccupancy: new Map(),
  previousEnemyPositions: new Map(),
  previousProjectilePositions: new Map(),
  projectilePositions: new Map(),
  renderAlpha: 0,
});

/**
 * Synchronizes the game engine state into the mutable render state.
 * Reuses objects where possible to minimize garbage collection.
 */
/* eslint-disable complexity */
export const syncRenderState = (
  engine: EngineState,
  renderState: RenderState,
  context: {
    enemyTypeMap: Map<string, EnemyConfig>;
    pathWaypoints: readonly EngineVector2[];
    tileSize: number;
  },
) => {
  const { enemyTypeMap, pathWaypoints, tileSize } = context;
  const engineEnemies = engine.enemies;

  // Reuse enemy objects by ID and retain their previous positions for interpolation.
  const nextEnemies: EnemyEntity[] = [];
  const activeIds = new Set<string>();

  for (const engEnemy of engineEnemies) {
    activeIds.add(engEnemy.id);
    let renderEnemy = renderState.enemiesById.get(engEnemy.id);
    if (renderEnemy) {
      renderState.previousEnemyPositions.set(engEnemy.id, renderEnemy.position);
    }
    const pos = selectEnemyWorldPosition(engEnemy, pathWaypoints, tileSize);

    if (renderEnemy) {
      renderEnemy.pathIndex = engEnemy.pathIndex;
      renderEnemy.progress = engEnemy.progress;
      renderEnemy.position = pos;
      renderEnemy.hp = engEnemy.hp;
      renderEnemy.shield = engEnemy.shield ?? 0;
      renderEnemy.frozen = engEnemy.frozen ?? 0;
      renderEnemy.abilityCooldown = engEnemy.abilityCooldown ?? 0;
      renderEnemy.abilityActiveTimer = engEnemy.abilityActiveTimer ?? 0;
    } else {
      const baseConfig = enemyTypeMap.get(engEnemy.type);
      renderEnemy = {
        id: engEnemy.id,
        type: engEnemy.type,
        maxHp: engEnemy.maxHp ?? engEnemy.hp,
        config: {
          speed: engEnemy.speed ?? baseConfig?.speed ?? 0,
          hp: engEnemy.hp,
          shield: engEnemy.shield ?? baseConfig?.shield ?? 0,
          reward: engEnemy.reward ?? baseConfig?.reward ?? 0,
          color: engEnemy.color ?? baseConfig?.color ?? '#ffffff',
          scale: engEnemy.scale ?? baseConfig?.scale,
          abilities: baseConfig?.abilities,
        },
        pathIndex: engEnemy.pathIndex,
        progress: engEnemy.progress,
        position: pos,
        hp: engEnemy.hp,
        shield: engEnemy.shield ?? 0,
        maxShield: engEnemy.maxShield ?? engEnemy.shield ?? 0,
        frozen: engEnemy.frozen ?? 0,
        abilityCooldown: engEnemy.abilityCooldown ?? 0,
        abilityActiveTimer: engEnemy.abilityActiveTimer ?? 0,
      };
      renderState.enemiesById.set(engEnemy.id, renderEnemy);
      renderState.previousEnemyPositions.set(engEnemy.id, pos);
    }
    nextEnemies.push(renderEnemy);
  }
  for (const id of renderState.enemiesById.keys()) {
    if (!activeIds.has(id)) {
      renderState.enemiesById.delete(id);
    }
  }

  for (const id of renderState.previousEnemyPositions.keys()) {
    if (!activeIds.has(id)) {
      renderState.previousEnemyPositions.delete(id);
    }
  }
  renderState.enemies = nextEnemies;
  const nextTowers: TowerEntity[] = [];
  renderState.gridOccupancy.clear();

  for (const engTower of engine.towers) {
    const tower: TowerEntity = {
      id: engTower.id,
      type: engTower.type as TowerType,
      gridPos: [engTower.gridPosition[0], engTower.gridPosition[1]],
      position: [engTower.gridPosition[0] * tileSize, 0.5, engTower.gridPosition[1] * tileSize],
      lastFired: engTower.lastFired,
      targetId: engTower.targetId ?? null,
      targetingMode: engTower.targetingMode ?? 'first',
      level: engTower.level,
      activeSynergies: engTower.activeSynergies,
    };
    nextTowers.push(tower);

    const key = gridKey(engTower.gridPosition[0], engTower.gridPosition[1]);
    renderState.gridOccupancy.set(key, tower);
  }
  renderState.towers = nextTowers;

  const nextProjectiles: ProjectileEntity[] = [];
  const previousProjectilePositions = renderState.previousProjectilePositions;
  previousProjectilePositions.clear();
  const activeProjectileIds = new Set<string>();

  for (const proj of engine.projectiles) {
    activeProjectileIds.add(proj.id);
    const lastPos = renderState.projectilePositions.get(proj.id);
    if (lastPos) {
      previousProjectilePositions.set(proj.id, lastPos);
    }
    const target = renderState.enemiesById.get(proj.targetId);
    // Keep interpolating toward the last known position when the target disappears.
    const targetPosition = target?.position ?? proj.lastTargetPosition;
    const pos: Position3 = targetPosition
      ? ([
          lerp(proj.origin[0], targetPosition[0], proj.progress),
          lerp(proj.origin[1], targetPosition[1], proj.progress),
          lerp(proj.origin[2], targetPosition[2], proj.progress),
        ] as Position3)
      : proj.origin;

    if (!lastPos) {
      previousProjectilePositions.set(proj.id, pos);
    }
    renderState.projectilePositions.set(proj.id, pos);

    nextProjectiles.push({
      id: proj.id,
      startPos: proj.origin,
      position: pos,
      lastTargetPosition: proj.lastTargetPosition,
      targetId: proj.targetId,
      speed: proj.speed,
      progress: proj.progress,
      damage: proj.damage,
      color: proj.color,
    });
  }
  for (const id of renderState.projectilePositions.keys()) {
    if (!activeProjectileIds.has(id)) {
      renderState.projectilePositions.delete(id);
      previousProjectilePositions.delete(id);
    }
  }

  renderState.projectiles = nextProjectiles;
  renderState.effects = engine.effects.map((e) => ({
    id: e.id,
    type: e.type,
    position: e.position,
    color: e.color,
    scale: e.scale,
    duration: e.duration,
    createdAt: e.createdAt,
  }));
};
/* eslint-enable complexity */
