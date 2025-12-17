# DESIGN003: Performance Optimizations and Selection Fixes

## Context
The game was experiencing potential performance bottlenecks due to excessive Garbage Collection (GC) in the main loop and high draw calls for tower rendering. Additionally, users reported issues with clicking and selecting towers, particularly those far from the origin.

## Engine Optimization: Object Pooling
To reduce GC pressure, we introduced an `EngineCache` pattern.

### Problem
The `stepEngine` function and its subordinates (`stepProjectiles`, `stepEnemies`) were allocating new `Map` and `Array` structures every tick (60 times per second).

### Solution
- **`EngineCache` Interface**: Defined in `types.ts`, containing reusable structures:
  - `projectileHits`: `Map<string, number>`
  - `activeProjectiles`: `Projectile[]`
  - `enemiesById`: `Map<string, EngineEnemy>`
  - `nextEnemies`: `EngineEnemy[]`
- **Implementation**: 
  - `GameState.tsx` maintains a persistent `useRef<EngineCache>`.
  - `step.ts` accepts this cache optionally.
  - Sub-functions clear and reuse these collections instead of creating new ones.
  - **Immutability**: To respect React state updates, we `.slice()` the reused arrays when returning the final patch, ensuring the game state receives fresh references while the intermediate logic uses pooled memory.

## Rendering Optimization: Instancing
To improve rendering performance, we moved from individual Tower components to Instanced Rendering.

### Problem
Rendering hundreds of individual `Tower` React components (each with multiple meshes) caused excessive draw calls.

### Solution
- **`InstancedTowers.tsx`**: A single component managing all towers.
- **Component breakdown**: Used three `InstancedMesh` layers:
  - `Base`: Box geometry
  - `Turret`: Octahedron geometry
  - `Rings`: Ring geometry
- **Dynamic Updates**: `useFrame` updates matrices for color and scale changes based on tower level and selection state.

## Selection & Interaction Fixes
Tower selection was unreliable due to `InstancedMesh` raycasting limitations and event conflicts.

### Problem 1: Raycasting Culling
`InstancedMesh` uses the bounding sphere of the original geometry (usually unit size at origin) for frustum culling and raycast optimizations. Tower instances far from the origin were being culled by the raycaster.

### Fix 1: Infinite Bounding Sphere
We explicitly set the bounding sphere of all instanced tower geometries to `Infinity` and disabled `frustumCulled`. This forces the raycaster to check all instances regardless of the camera or object position. A `useFrame` check ensures this persists.

### Problem 2: Event Conflicts
The Map Tiles used `onClick` while Towers initially used `onPointerDown`. This caused a race condition where the map (being "behind" the tower) received a click event and deselected the tower immediately after selection.

### Fix 2: Event Synchronization
- Switched Tower interaction to `onPointerDown` (more responsive).
- **Tile Fallback**: Modified `World.tsx` (Map Tiles) to check if a tower exists at the clicked coordinates. If a tower is found, the tile click selects the tower instead of deselecting it. This acts as a robust fallback for missed raycasts.

## Outcome
- **Performance**: Significant reduction in per-frame allocations and draw calls.
- **UX**: Tower selection is now instant, robust across the entire map, and works even when clicking the ground beneath a tower.
