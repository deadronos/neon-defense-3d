import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../../constants';

import { writeEnemyWorldPosition } from './selectors';
import type { EngineEnemy, EngineMutableVector3, EngineVector2, EngineVector3 } from './types';

/**
 * A spatial grid represented as a flat array of lists.
 * Index = z * width + x
 */
export type SpatialGrid = EngineEnemy[][];

/**
 * Builds a spatial grid from the current list of enemies.
 *
 * @param enemies List of active enemies.
 * @param pathWaypoints The path waypoints for position calculation.
 * @param tileSize Size of a tile in world units.
 * @param width Map width in tiles.
 * @param height Map height in tiles.
 */
export const buildSpatialGrid = (
  enemies: EngineEnemy[],
  pathWaypoints: readonly EngineVector2[],
  tileSize: number = TILE_SIZE,
  width: number = MAP_WIDTH,
  height: number = MAP_HEIGHT,
  reuseGrid?: SpatialGrid,
  scratchPosition: EngineMutableVector3 = [0, 0, 0],
  enemyPositions?: Map<string, EngineMutableVector3>,
  enemyPositionPool?: EngineMutableVector3[],
): SpatialGrid => {
  const size = width * height;
  const reused = reuseGrid?.length === size ? reuseGrid : undefined;
  const grid: SpatialGrid = reused ?? new Array<EngineEnemy[]>(size);

  if (reused) {
    for (let i = 0; i < size; i++) {
      grid[i].length = 0;
    }
  } else {
    for (let i = 0; i < size; i++) {
      grid[i] = [];
    }
  }

  for (const enemy of enemies) {
    const pos = writeEnemyWorldPosition(scratchPosition, enemy, pathWaypoints, tileSize);
    if (enemyPositions) {
      const stored = enemyPositionPool?.pop() ?? [0, 0, 0];
      stored[0] = pos[0];
      stored[1] = pos[1];
      stored[2] = pos[2];
      enemyPositions.set(enemy.id, stored);
    }
    const x = Math.floor(pos[0] / tileSize);
    const z = Math.floor(pos[2] / tileSize);

    // Clamp coordinates to ensure they stay within bounds
    // (Enemies might slightly overshoot or be spawned just outside)
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedZ = Math.max(0, Math.min(height - 1, z));

    const index = clampedZ * width + clampedX;
    grid[index].push(enemy);
  }

  return grid;
};

/**
 * Iterates over enemies that fall within the tile bounds of a radius around a position.
 * Avoids allocating a candidates array per query.
 */
export const forEachNearbyEnemy = (
  grid: SpatialGrid,
  position: EngineVector3,
  radius: number,
  tileSize: number = TILE_SIZE,
  width: number = MAP_WIDTH,
  height: number = MAP_HEIGHT,
  visit: (enemy: EngineEnemy) => void,
) => {
  const centerX = position[0] / tileSize;
  const centerZ = position[2] / tileSize;
  const radiusInTiles = radius / tileSize;

  const minX = Math.max(0, Math.floor(centerX - radiusInTiles));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radiusInTiles));
  const minZ = Math.max(0, Math.floor(centerZ - radiusInTiles));
  const maxZ = Math.min(height - 1, Math.ceil(centerZ + radiusInTiles));

  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      const index = z * width + x;
      const cellEnemies = grid[index];
      for (let i = 0; i < cellEnemies.length; i++) {
        visit(cellEnemies[i]);
      }
    }
  }
};

/**
 * Retrieves a list of candidate enemies within a square area around the position.
 * The area covers all tiles that could possibly contain an enemy within the given radius.
 *
 * @param grid The spatial grid.
 * @param position Center position (e.g., tower position).
 * @param radius Radius of interest (e.g., tower range).
 * @param tileSize Size of a tile in world units.
 * @param width Map width in tiles.
 * @param height Map height in tiles.
 */
export const getNearbyEnemies = (
  grid: SpatialGrid,
  position: EngineVector3,
  radius: number,
  tileSize: number = TILE_SIZE,
  width: number = MAP_WIDTH,
  height: number = MAP_HEIGHT,
): EngineEnemy[] => {
  const centerX = position[0] / tileSize;
  const centerZ = position[2] / tileSize;
  const radiusInTiles = radius / tileSize;

  // Calculate integer bounds of tiles to check
  // We floor/ceil to ensure we cover any tile that partially intersects the radius
  const minX = Math.max(0, Math.floor(centerX - radiusInTiles));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radiusInTiles));
  const minZ = Math.max(0, Math.floor(centerZ - radiusInTiles));
  const maxZ = Math.min(height - 1, Math.ceil(centerZ + radiusInTiles));

  const candidates: EngineEnemy[] = [];

  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      const index = z * width + x;
      const cellEnemies = grid[index];
      // Micro-optimization: standard for loop is often faster than spread or concat for small arrays
      for (let i = 0; i < cellEnemies.length; i++) {
        candidates.push(cellEnemies[i]);
      }
    }
  }

  return candidates;
};
