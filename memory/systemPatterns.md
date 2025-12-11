# System Patterns

This file documents the recurring architectural patterns and conventions used across the codebase so contributors and automated agents can remain consistent.

## High-level architecture

- Central `GameState` (React Context / `GameProvider` in `src/game/GameState.tsx`) holds the canonical arrays of entities (`enemies`, `towers`, `projectiles`, `effects`) and global values (`money`, `lives`, `wave`, `gameStatus`).
- `GameLoopBridge` (`src/game/components/GameLoop.tsx`) uses `useFrame` from `@react-three/fiber` as the single per-frame driver for game logic:
  - Delegates wave updates to `useWaveManager`.
  - Updates enemies via `useEnemyBehavior`.
  - Updates towers via `useTowerBehavior` (which may spawn projectiles).
  - Updates projectiles via `useProjectileBehavior` (collision, damage, rewards).
- Rendering is a pure view layer that consumes `GameState` arrays. For performance, enemies and projectiles are rendered with `InstancedMesh` implementations (`InstancedEnemies`, `InstancedProjectiles`).

## Data & state conventions

- Always use functional state updates for arrays inside the loop (e.g., `setEnemies(prev => ...)`) to avoid lost updates or closure issues.
- Treat state objects as effectively immutable to render code; create shallow copies when mutating values inside behavior hooks before returning updated arrays.

## Hot path & performance patterns

- Prefer `InstancedMesh` for high-count entities to minimize draw calls and per-object overhead.
- Compute world coordinates from grid coordinates centrally via `TILE_SIZE` (defined in `src/constants.ts`).
- Keep per-frame allocations low — reuse objects where practical inside hooks or move expensive calculations out of the hot loop.

## Core extension points

- `TOWER_CONFIGS`, `ENEMY_TYPES`, and `MAP_LAYOUTS` in `src/constants.ts` are primary config surfaces for adding gameplay content.
- `getTowerStats` in `src/game/utils.ts` computes tower stats given level and global upgrades.
- Hooks like `useWaveManager`, `useTowerState`, `useEntityState` provide clear locations for changing behavior or adding tests.

## Pathfinding

- Paths are generated at startup (or map change) using a BFS implementation in `generatePath` (`src/constants.ts`). Waypoints are used by enemies to progress along the path.

## Testing & validation

- Unit tests live under `tests/` and run with Vitest. Focus tests on deterministic logic: wave progression (`useWaveManager`), tower targeting, projectile collision, and path generation.
