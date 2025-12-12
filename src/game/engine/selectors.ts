import type { EngineEnemy, EngineProjectile, EngineVector2, EngineVector3 } from './types';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const selectEnemyWorldPosition = (
  enemy: EngineEnemy,
  pathWaypoints: readonly EngineVector2[],
  tileSize: number,
): EngineVector3 => {
  const p1 = pathWaypoints[enemy.pathIndex] ?? [0, 0];
  const p2 = pathWaypoints[enemy.pathIndex + 1] ?? p1;
  const x = lerp(p1[0], p2[0], enemy.progress) * tileSize;
  const z = lerp(p1[1], p2[1], enemy.progress) * tileSize;
  return [x, 1, z];
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
