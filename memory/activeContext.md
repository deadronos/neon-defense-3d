# Active Context

## Current focus

- Sync `/memory` documentation to match the current source tree (this update). The primary goals are accurate discovery and clear next-step tracking for contributors.

## Recent changes (code highlights)

- `InstancedEnemies` and `InstancedProjectiles` use `THREE.InstancedMesh` for large counts (see `src/game/components/Enemies.tsx` and `src/game/components/Projectiles.tsx`).
- `GameLoopBridge` (`src/game/components/GameLoop.tsx`) centralizes per-frame logic via `useFrame`: enemy movement, tower firing, projectile updates, and wave management.
- Wave system moved to `useWaveManager` with phases and spawn logic; path generation uses BFS in `src/constants.ts` (`generatePath`).
- UI overlay (`src/components/UI.tsx`) handles game states (`idle`, `playing`, `gameover`, `victory`) and build/upgrade flows. Victory transitions grant research points.

## Next steps

- Add small unit tests around `useWaveManager`, `useEnemyBehavior`, and `useProjectileBehavior` to lock expected behavior.
- Create design docs for major features (e.g., Tech Tree/sector progression) under `memory/designs/`.
- Monitor runtime performance and reduce allocations in hot loops if GC pressure appears.

## Open decisions

- Visual fidelity vs. performance: whether to reintroduce expensive effects (trails, per-entity lights) via instancing or shaders.
- Sector/progression balancing: decide wave lengths and reward curves for persistent campaign progression.
