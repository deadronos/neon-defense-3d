import { TOWER_CONFIGS } from '../../constants';

import { selectEnemyWorldPosition } from './selectors';
import { buildSpatialGrid, getNearbyEnemies } from './spatial';
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

const getTowerStats = (towerType: string, level: number) => {
  const config = TOWER_CONFIGS[towerType as keyof typeof TOWER_CONFIGS];
  const baseDamage = config?.damage ?? 0;
  const baseRange = config?.range ?? 0;
  const baseCooldown = config?.cooldown ?? 1;
  const freezeDuration = config?.freezeDuration;
  const splashRadius = config?.splashRadius;

  return {
    damage: baseDamage * (1 + (level - 1) * 0.25),
    range: baseRange * (1 + (level - 1) * 0.1),
    cooldownMs: Math.max(0.1, baseCooldown * (1 - (level - 1) * 0.05)) * 1000,
    freezeDuration,
    splashRadius,
  };
};

const selectTowerWorldPosition = (tower: EngineTower, tileSize: number): EngineVector3 => [
  tower.gridPosition[0] * tileSize,
  TOWER_HEIGHT_Y,
  tower.gridPosition[1] * tileSize,
];

const distance = (a: EngineVector3, b: EngineVector3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const stepTowers = (
  state: EngineState,
  pathWaypoints: readonly EngineVector2[],
  context: EngineTickContext,
  options: StepTowersOptions = {},
): EngineTickResult => {
  const tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
  const events: EngineEvents = { immediate: [], deferred: [] };

  let nextProjectileCounter = state.idCounters.projectile;
  const newProjectiles: EngineProjectile[] = [];
  let nextTowers: EngineTower[] | undefined;

  // Build spatial grid once per tick
  const spatialGrid =
    state.enemies.length > 0 ? buildSpatialGrid(state.enemies, pathWaypoints, tileSize) : undefined;

  for (let index = 0; index < state.towers.length; index += 1) {
    const tower = state.towers[index];
    if (!tower) continue;

    const stats = getTowerStats(tower.type, tower.level);
    if (context.nowMs - tower.lastFired < stats.cooldownMs) continue;

    const towerPos = selectTowerWorldPosition(tower, tileSize);

    let targetId: string | undefined;
    let minDistance = Infinity;

    const candidates = spatialGrid
      ? getNearbyEnemies(spatialGrid, towerPos, stats.range, tileSize)
      : state.enemies;

    for (const enemy of candidates) {
      const enemyPos = selectEnemyWorldPosition(enemy, pathWaypoints, tileSize);
      const d = distance(towerPos, enemyPos);
      if (d <= stats.range && d < minDistance) {
        minDistance = d;
        targetId = enemy.id;
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
      speed: 20,
      progress: 0,
      damage: stats.damage,
      color,
      freezeDuration: stats.freezeDuration,
      splashRadius: stats.splashRadius,
    });

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
