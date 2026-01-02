# Design: Spatial Partitioning for Targeting Optimization

## Context

Currently, `stepTowers` in `src/game/engine/tower.ts` performs a brute-force search to find a target for each tower. It iterates through all active enemies to find the closest one within range. This results in a time complexity of O(N \* M), where N is the number of towers and M is the number of enemies. As the game progresses and enemy counts increase, this becomes a performance bottleneck.

## Goals

- Optimize tower targeting to reduce CPU usage.
- Implement a spatial partitioning system (Spatial Grid) to quickly retrieve enemies within a specific area.
- Maintain existing targeting logic (closest enemy, range checks).

## Proposed Solution: Spatial Grid

We will implement a simple spatial grid (or bin-lattice) that divides the game world into buckets corresponding to the map tiles.

### 1. Spatial Grid Structure

Since the game map is a fixed grid (12x8 tiles) and entities move primarily on this grid, the spatial buckets will align with the tile grid.

- **Grid Dimensions:** 12 columns x 8 rows.
- **Bucket Size:** 1 tile (2x2 world units).
- **Data Structure:** A 2D array (or flattened 1D array) where each cell contains a list of `EngineEnemy` IDs or references.

### 2. Update Cycle

At the beginning of each tick (specifically in `stepTowers` or earlier in the loop if shared):

1.  **Clear** the grid.
2.  **Populate**: For each active enemy:
    - Calculate its current world position.
    - Determine the grid cell coordinates `(x, z)`.
    - Add the enemy to the corresponding bucket.

### 3. Querying

When a tower needs to find a target:

1.  Identify the tower's grid position `(tx, tz)`.
2.  Calculate the search bounds based on the tower's range.
    - `rangeTiles = ceil(range / TILE_SIZE)`
    - `minX = tx - rangeTiles`, `maxX = tx + rangeTiles`
    - `minZ = tz - rangeTiles`, `maxZ = tz + rangeTiles`
3.  Iterate through the grid buckets within these bounds.
4.  For each enemy in these buckets:
    - Perform the precise distance check.
    - Keep track of the closest enemy found so far.

## API Changes

### New Module: `src/game/engine/spatial.ts`

```typescript
export class SpatialGrid {
  constructor(width: number, height: number, tileSize: number);
  clear(): void;
  add(enemy: EngineEnemy, position: EngineVector3): void;
  query(position: EngineVector3, radius: number): EngineEnemy[]; // Returns potential candidates
}
```

_Refinement:_ Since `stepTowers` is a pure function (conceptually) taking `state` and returning `patch`, we shouldn't rely on a persistent mutable class instance if we want to keep the engine functional-style, but `stepTowers` rebuilds the grid every frame anyway. We can just create a transient grid inside `stepTowers` or a helper function that returns it.

Given the functional nature of the engine, a helper function `buildSpatialGrid` that returns the grid structure is appropriate.

```typescript
// src/game/engine/spatial.ts

export type SpatialGrid = EngineEnemy[][][]; // or flattened

export const buildSpatialGrid = (
  enemies: EngineEnemy[],
  pathWaypoints: readonly EngineVector2[],
  tileSize: number,
  mapWidth: number,
  mapHeight: number
): SpatialGrid => { ... }

export const getEnemiesInRadius = (
  grid: SpatialGrid,
  position: EngineVector3, // Tower world position
  range: number,
  tileSize: number,
  mapWidth: number,
  mapHeight: number
): EngineEnemy[] => { ... }
```

However, `getEnemiesInRadius` might just return an iterator or loop internally to avoid allocating new arrays of candidates. To be most efficient, we might inline the iteration logic or use a callback.

For `stepTowers`, the flow will be:

1. Build grid once.
2. For each tower:
   - Get potential targets from grid.
   - Find best target.

## Verification Plan

- **Unit Tests:** Verify `buildSpatialGrid` places enemies in correct cells. Verify `query` returns correct set of enemies (including edge cases like enemies on tile boundaries).
- **Integration Check:** Ensure towers still fire at the correct closest enemy.
- **Performance:** (Optional/Implicit) The complexity drops to O(N \* k) where k is the average number of enemies in the tower's vicinity.

## Constraints

- Map size is fixed in `src/constants.ts` (MAP_WIDTH, MAP_HEIGHT).
- TILE_SIZE is 2.
