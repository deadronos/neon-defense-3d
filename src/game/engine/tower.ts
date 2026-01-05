import { MAP_HEIGHT, MAP_WIDTH, TOWER_CONFIGS } from '../../constants';
import type { TowerType } from '../../types';
import { getTowerStats } from '../utils';

import { writeEnemyWorldPosition } from './selectors';
import { buildSpatialGrid, forEachNearbyEnemy } from './spatial';
import type { EngineCache } from './step';
import type {
  EngineEvents,
  EnginePatch,
  EngineProjectile,
  EngineState,
  EngineTickContext,
  EngineTickResult,
  EngineVector2,
  EngineVector3,
  EngineTower,
} from './types';

export interface StepTowersOptions {
  tileSize?: number;
}

const DEFAULT_TILE_SIZE = 2;
const TOWER_HEIGHT_Y = 0.5;
const PROJECTILE_SPAWN_OFFSET_Y = 1.5;

/** Default projectile speed in world units per second. */
const PROJECTILE_SPEED = 20;

const selectTowerWorldPosition = (tower: EngineTower, tileSize: number): EngineVector3 => [
  tower.gridPosition[0] * tileSize,
  TOWER_HEIGHT_Y,
  tower.gridPosition[1] * tileSize,
];

const distanceSquared = (a: EngineVector3, b: EngineVector3) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

export const stepTowers = (
  state: EngineState,
  pathWaypoints: readonly EngineVector2[],
  context: EngineTickContext,
  options: StepTowersOptions = {},
  cache?: EngineCache,
): EngineTickResult => {
  const tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
  const events: EngineEvents = { immediate: [], deferred: [] };

  let nextProjectileCounter = state.idCounters.projectile;
  const newProjectiles: EngineProjectile[] = [];
  let nextTowers: EngineTower[] | undefined;
  const scratchEnemyPos = cache?.scratchEnemyPos ?? [0, 0, 0];
  const enemyPositions = cache?.enemyPositions;
  const enemyPositionPool = cache?.enemyPositionPool;

  if (cache && enemyPositions && enemyPositionPool) {
    for (const position of enemyPositions.values()) {
      enemyPositionPool.push(position);
    }
    enemyPositions.clear();
    cache.enemyPositionsSource = undefined;
  }

  // Build spatial grid once per tick
  const spatialGrid =
    state.enemies.length > 0
      ? buildSpatialGrid(
          state.enemies,
          pathWaypoints,
          tileSize,
          undefined,
          undefined,
          cache?.spatialGrid,
          scratchEnemyPos,
          enemyPositions,
          enemyPositionPool,
        )
      : undefined;
  if (cache) {
    cache.spatialGrid = spatialGrid;
    if (enemyPositions) cache.enemyPositionsSource = state.enemies;
  }

  for (let index = 0; index < state.towers.length; index += 1) {
    const tower = state.towers[index];
    if (!tower) continue;

    const stats = getTowerStats(tower.type as TowerType, tower.level, {
      activeSynergies: tower.activeSynergies,
      upgrades: context.upgrades,
    });
    const cooldownMs = stats.cooldown * 1000;

    if (context.nowMs - tower.lastFired < cooldownMs) continue;

    const towerPos = selectTowerWorldPosition(tower, tileSize);
    const rangeSquared = stats.range * stats.range;

    let targetId: string | undefined;
    let minDistanceSquared = Infinity;

    if (spatialGrid) {
      forEachNearbyEnemy(
        spatialGrid,
        towerPos,
        stats.range,
        tileSize,
        MAP_WIDTH,
        MAP_HEIGHT,
        (enemy) => {
          const cachedPos = enemyPositions?.get(enemy.id);
          const position = cachedPos
            ? cachedPos
            : writeEnemyWorldPosition(scratchEnemyPos, enemy, pathWaypoints, tileSize);
          const d2 = distanceSquared(towerPos, position);
          if (d2 <= rangeSquared && d2 < minDistanceSquared) {
            minDistanceSquared = d2;
            targetId = enemy.id;
          }
        },
      );
    } else {
      for (const enemy of state.enemies) {
        writeEnemyWorldPosition(scratchEnemyPos, enemy, pathWaypoints, tileSize);
        const d2 = distanceSquared(towerPos, scratchEnemyPos);
        if (d2 <= rangeSquared && d2 < minDistanceSquared) {
          minDistanceSquared = d2;
          targetId = enemy.id;
        }
      }
    }

    if (!targetId) continue;

    nextProjectileCounter += 1;
    const projectileId = `projectile-${nextProjectileCounter}`;

    const origin: EngineVector3 = [
      towerPos[0],
      towerPos[1] + PROJECTILE_SPAWN_OFFSET_Y,
      towerPos[2],
    ];

    const color = TOWER_CONFIGS[tower.type as keyof typeof TOWER_CONFIGS]?.color ?? '#ffffff';

    newProjectiles.push({
      id: projectileId,
      origin,
      targetId,
      speed: PROJECTILE_SPEED,
      progress: 0,
      damage: stats.damage,
      color,
      freezeDuration: stats.freezeDuration,
      splashRadius: stats.splashRadius,
    });

    events.immediate.push({ type: 'ProjectileFired', projectileId, towerId: tower.id });

    const nextTower: EngineTower = { ...tower, lastFired: context.nowMs, targetId };
    if (!nextTowers) nextTowers = state.towers.slice();
    nextTowers[index] = nextTower;
  }

  const patch: EnginePatch = {
    towers: nextTowers,
    projectiles: newProjectiles.length > 0 ? [...state.projectiles, ...newProjectiles] : undefined,
    idCounters:
      nextProjectileCounter !== state.idCounters.projectile
        ? { projectile: nextProjectileCounter }
        : undefined,
  };

  return { patch, events };
};
