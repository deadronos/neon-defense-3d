# Active Context

## Current focus

- Sync `/memory` documentation to match the current source tree (this update). The primary goals are accurate discovery and clear next-step tracking for contributors.
- Codebase cleanup pass (lint/types/perf) and task tracking improvements.

## Recent changes (code highlights)

- `InstancedEnemies` and `InstancedProjectiles` use `THREE.InstancedMesh` for large counts (see `src/game/components/Enemies.tsx` and `src/game/components/Projectiles.tsx`).
- `GameLoopBridge` (`src/game/components/GameLoop.tsx`) now delegates simulation stepping to the pure engine via `useGame().step(...)`.
- `GameProvider` (`src/game/GameState.tsx`) is now reducer-driven (engine + UI), with entity arrays derived from engine state via selectors (no `three` types in engine state).
- Runtime adapter now derives `isPlaying` from `gameStatus` (no duplicate storage) and avoids unsafe `as unknown as` casts in the core wiring.
- Engine projectile stepping now pre-indexes enemies once per tick (avoids `O(P*E)` target lookups); renderer reuses maps/caches between frames.
- Engine wave progression now lives in `src/game/engine/wave.ts`; path generation uses BFS in `src/constants.ts` (`generatePath`).
- UI overlay (`src/components/UI.tsx`) handles game states (`idle`, `playing`, `gameover`, `victory`) and build/upgrade flows. Victory transitions grant research points.
- Engine/runtime unit tests live under `src/tests/game/engine/` and cover tick contracts and state transitions.

## Next steps

- Do a manual gameplay parity pass (movement, firing cadence, rewards, victory after wave 10).
- Consider reducing per-frame allocations from deriving `THREE.Vector3` in selectors if performance/GC becomes an issue.
- Create design docs for major features (e.g., Tech Tree/sector progression) under `memory/designs/`.
- Monitor runtime performance and reduce allocations in hot loops if GC pressure appears.

## Open decisions

- Visual fidelity vs. performance: whether to reintroduce expensive effects (trails, per-entity lights) via instancing or shaders.
- Sector/progression balancing: decide wave lengths and reward curves for persistent campaign progression.
