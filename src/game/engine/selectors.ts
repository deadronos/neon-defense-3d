import { lerp } from '../../utils/math';

import type {
  EngineEnemy,
  EngineMutableVector3,
  EngineProjectile,
  EngineVector2,
  EngineVector3,
} from './types';

export const writeEnemyWorldPosition = (
  out: EngineMutableVector3,
  enemy: EngineEnemy,
  pathWaypoints: readonly EngineVector2[],
  tileSize: number,
): EngineMutableVector3 => {
  const p1 = pathWaypoints[enemy.pathIndex] ?? [0, 0];
  const p2 = pathWaypoints[enemy.pathIndex + 1] ?? p1;
  out[0] = lerp(p1[0], p2[0], enemy.progress) * tileSize;
  out[1] = 1;
  out[2] = lerp(p1[1], p2[1], enemy.progress) * tileSize;
  return out;
};

export const selectEnemyWorldPosition = (
  enemy: EngineEnemy,
  pathWaypoints: readonly EngineVector2[],
  tileSize: number,
): EngineVector3 => {
  return writeEnemyWorldPosition([0, 0, 0], enemy, pathWaypoints, tileSize);
};

export const selectProjectileWorldPosition = (
  projectile: EngineProjectile,
  target: EngineEnemy | undefined,
  pathWaypoints: readonly EngineVector2[],
  tileSize: number,
): EngineVector3 => {
  if (!target) return projectile.origin;
  const targetPos = selectEnemyWorldPosition(target, pathWaypoints, tileSize);
  const x = lerp(projectile.origin[0], targetPos[0], projectile.progress);
  const y = lerp(projectile.origin[1], targetPos[1], projectile.progress);
  const z = lerp(projectile.origin[2], targetPos[2], projectile.progress);
  return [x, y, z];
};
