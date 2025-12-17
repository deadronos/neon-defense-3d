# TASK005: Performance Optimizations and Selection Fixes

## Status

- **State**: Completed
- **Created**: 2025-12-17
- **related_designs**:
  - [DESIGN003-performance-optimizations-and-fixes.md](../designs/DESIGN003-performance-optimizations-and-fixes.md)

## Objectives

1. Optimize the main game loop to reduce Garbage Collection.
2. Optimize tower rendering using Instanced Rendering.
3. Fix and improve tower selection UX.

## Implementation Steps

### 1. Engine Optimization

- Analyzed `step.ts`, `projectile.ts`, and `enemy.ts`.
- Introduced `EngineCache` in `GameState.tsx`.
- Refactored update functions to accept and utilize the cache for `Map` and `Array` reuse.
- Verified that state immutability is preserved for React rendering while using mutable structures for intermediate calculations.

### 2. Instanced Rendering

- Created `InstancedTowers.tsx`.
- Replaced the loop of `<Tower />` components in `Scene.tsx` with `<InstancedTowers />`.
- Implemented visual parity (Base, Turret, Rings, Range indicators).
- Handled dynamic coloring and scaling via instance attributes.

### 3. Selection Debugging & Fixes

- **Issue**: Users reported clicking towers did not work.
- **Discovery**:
  - `InstancedMesh` raycasting failing for off-center instances.
  - Event conflict between "PointerDown" (Tower) and "Click" (Map).
- **Fixes**:
  - **Raycasting**: Manually expanded Geometry Bounding Sphere to `Infinity`.
  - **Interaction**: Standardized on `onPointerDown` for towers.
  - **UX**: Implemented "Smart Tile Click" in `World.tsx`. If a tile has a tower, clicking the tile selects the tower.

## Verification

- **Tests**: Ran `npm test` successfully (34 tests passed).
- **Manual Verification**:
  - Verified game loop stability.
  - Verified visual correctness of towers.
  - Verified robust selection of towers at all map positions.
  - Verified improvements in click responsiveness.

## Next Steps

- Monitor performance on larger maps or higher wave counts.
- Consider applying `InstancedMesh` optimization to other static decorations if added.
