import { MAP_HEIGHT, MAP_WIDTH } from '../../../constants';
import { writeEnemyWorldPosition } from '../selectors';
import { forEachNearbyEnemy } from '../spatial';
import type { SpatialGrid } from '../spatial';
import type { EngineEnemy, EngineVector3, EngineMutableVector3, EngineVector2 } from '../types';

const distanceSquared = (a: EngineVector3, b: EngineVector3) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

export interface ImpactContext {
  enemyPositions: Map<string, EngineMutableVector3>;
  enemyPositionPool: EngineMutableVector3[];
  spatialGrid?: SpatialGrid;
  pathWaypoints: readonly EngineVector2[];
  tileSize: number;
}

export const ensureEnemyPosition = (enemy: EngineEnemy, context: ImpactContext): EngineVector3 => {
  const { enemyPositions, enemyPositionPool, pathWaypoints, tileSize } = context;
  const existing = enemyPositions.get(enemy.id);
  if (existing !== undefined) {
    writeEnemyWorldPosition(existing, enemy, pathWaypoints, tileSize);
    return existing;
  }
  const next = enemyPositionPool.pop() ?? [0, 0, 0];
  writeEnemyWorldPosition(next, enemy, pathWaypoints, tileSize);
  enemyPositions.set(enemy.id, next);
  return next;
};

export const findTargetsInSplash = (
  impactPos: EngineVector3,
  splashRadius: number,
  enemies: readonly EngineEnemy[],
  context: ImpactContext,
  callback: (enemy: EngineEnemy) => void,
) => {
  const splashRadiusSquared = splashRadius ** 2;
  const { spatialGrid, tileSize } = context;

  if (spatialGrid) {
    forEachNearbyEnemy(
      spatialGrid,
      impactPos,
      splashRadius,
      tileSize,
      MAP_WIDTH,
      MAP_HEIGHT,
      (enemy) => {
        const pos = ensureEnemyPosition(enemy, context);
        if (distanceSquared(impactPos, pos) <= splashRadiusSquared) {
          callback(enemy);
        }
      },
    );
  } else {
    for (const enemy of enemies) {
      const pos = ensureEnemyPosition(enemy, context);
      if (distanceSquared(impactPos, pos) <= splashRadiusSquared) {
        callback(enemy);
      }
    }
  }
};
