# DESIGN013 — Performance Hot Paths (Targeted Optimizations)

**Status:** Draft  
**Updated:** 2026-01-02

## Summary

Reduce per-tick allocations and hot-loop math in the engine/render pipeline while preserving gameplay behavior. Focus on cached spatial data, cached enemy positions, squared distance checks, and fast projectile target lookup in rendering.

## Architecture Overview

```
GameLoopBridge -> GameState.step() -> stepEngine()
  -> stepWave()
  -> stepEnemies()   (uses cached path segment lengths)
  -> stepTowers()    (uses cached spatial grid + squared distance)
  -> stepProjectiles() (uses cached enemy positions + maps)
```

## Data Flow

1. `GameState` maintains `EngineCache` in a `useRef`.
2. `stepEngine` passes the cache through to sub-steps.
3. `stepEnemies` uses cached segment lengths when path/tile size unchanged.
4. `stepTowers` builds a spatial grid using a reusable grid array and avoids sqrt.
5. `stepProjectiles` uses cached enemy positions and reuse of maps.
6. Rendering derives projectiles using an enemy ID lookup map (no per-projectile scan).

## Interfaces & Contracts

- `selectors.ts`
  - `writeEnemyWorldPosition(out, enemy, pathWaypoints, tileSize): EngineMutableVector3`
  - Existing selectors remain for compatibility.

- `spatial.ts`
  - `buildSpatialGrid` supports reusing an existing grid array (clears buckets).

- `engine/step.ts`
  - `EngineCache` extended with:
    - `enemyPositions: Map<string, EngineMutableVector3>`
    - `pathSegmentLengths: number[]`
    - `pathWaypointsRef?: readonly EngineVector2[]`
    - `pathTileSize?: number`
    - `spatialGrid?: SpatialGrid`
    - `scratchEnemyPos: EngineMutableVector3`

- `GameState.tsx`
  - Build `enemiesById` map for projectile rendering.

## Data Model Notes

Cached structures are mutable and reused across ticks:

- Maps are cleared each tick.
- Arrays are length-reset, not replaced.
- Segment lengths recomputed only when path or tile size changes.

## Error Handling

- If cache is missing or stale, code falls back to allocations and direct computations.
- If path changes (new reference), segment lengths are recomputed automatically.

## Performance Expectations

- Reduced allocations per frame in tower targeting, spatial grid construction, and projectile splash checks.
- Lower CPU overhead by removing sqrt calls in tower targeting.
- Reduced rendering overhead with O(1) projectile target lookup.

## Validation Plan

- Run unit tests (engine + selectors) for behavior parity.
- Manual sanity check in dev: towers fire, enemies move, splash + freeze work, no regressions.
