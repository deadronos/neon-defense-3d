import { describe, it, expect } from 'vitest';
import { buildSpatialGrid, getNearbyEnemies } from '../game/engine/spatial';
import type { EngineEnemy, EngineVector2 } from '../game/engine/types';

// Mock selectEnemyWorldPosition via the real one or a simplified version?
// Since buildSpatialGrid imports it, we might need to mock the module or provide realistic inputs.
// However, the real selectEnemyWorldPosition uses linear interpolation between waypoints.
// Let's rely on simple inputs where waypoints are straightforward.

// We will construct enemies such that they are exactly at specific points.
const mockWaypoints: EngineVector2[] = [
  [0, 0],
  [10, 0], // x moves 0 -> 10
  [10, 10], // z moves 0 -> 10
];

// Helper to create a dummy enemy
const createEnemy = (id: string, pathIndex: number, progress: number): EngineEnemy => ({
  id,
  type: 'BASIC',
  pathIndex,
  progress,
  hp: 100,
  speed: 1,
});

describe('Spatial Grid', () => {
  const tileSize = 2;
  const width = 10;
  const height = 10;

  it('buckets enemies correctly', () => {
    // Enemy 1: At (0,0) tiles -> Grid [0,0]
    // pos = waypoint[0] = [0,0]
    const e1 = createEnemy('e1', 0, 0);

    // Enemy 2: At (5,0) tiles
    // pathIndex 0 is (0,0) to (10,0) tiles. Progress 0.5 gives (5,0) tiles.
    const e2 = createEnemy('e2', 0, 0.5);

    // Enemy 3: At (10, 5) tiles
    // pathIndex 1 is (10,0) to (10,10) tiles. Progress 0.5 gives (10, 5) tiles.
    // x=10 -> clamped to 9 (width-1). z=5.
    const e3 = createEnemy('e3', 1, 0.5);

    const enemies = [e1, e2, e3];
    const grid = buildSpatialGrid(enemies, mockWaypoints, tileSize, width, height);

    // Grid index = z * width + x
    const idx1 = 0 * width + 0;
    const idx2 = 0 * width + 5; // x=5
    const idx3 = 5 * width + 9; // x=clamped 9, z=5

    expect(grid[idx1]).toContain(e1);
    expect(grid[idx2]).toContain(e2);
    expect(grid[idx3]).toContain(e3);
  });

  it('retrieves nearby enemies', () => {
    // Diagonal Path: (0,0) -> (10,10) tiles.
    const diagonalPath: EngineVector2[] = [[0,0], [10,10]];

    // e1: Progress 0.4 -> (4,4) tiles.
    const e1 = createEnemy('e1', 0, 0.4);

    // e2: Progress 0.8 -> (8,8) tiles.
    const e2 = createEnemy('e2', 0, 0.8);

    const enemies = [e1, e2];
    const grid = buildSpatialGrid(enemies, diagonalPath, tileSize, width, height);

    // Query at World Position corresponding to Tile (2,2).
    // World Pos = [2*2, 0, 2*2] = [4, 0, 4].
    // Radius 3 world units = 1.5 tiles.
    // Range around tile (2,2): [0.5, 3.5] -> Integers [0, 1, 2, 3, 4].

    // e1 is at (4,4). Is (4,4) inside x[0..4], z[0..4]? Yes.
    // e2 is at (8,8). Is (8,8) inside x[0..4], z[0..4]? No.

    const candidates = getNearbyEnemies(grid, [4, 0, 4], 3, tileSize, width, height);

    expect(candidates).toContain(e1);
    expect(candidates).not.toContain(e2);
  });

  it('handles boundaries', () => {
    // Enemy at (0,0)
    const e1 = createEnemy('e1', 0, 0);
    const enemies = [e1];
    const grid = buildSpatialGrid(enemies, mockWaypoints, tileSize, width, height);

    // Query at (0,0)
    const candidates = getNearbyEnemies(grid, [0, 0, 0], 5, tileSize, width, height);
    expect(candidates).toContain(e1);
  });
});
