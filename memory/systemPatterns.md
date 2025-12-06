# System Patterns

This section records the common architecture and design patterns used in Neon Defense 3D so contributors and agents remain consistent.

## High-level architecture

- Single source-of-truth `GameState` (React Context) for all runtime entities.
- `GameLoopBridge` (inside `src/game/GameCanvas.tsx`) drives the frame-by-frame updates using `useFrame` from `@react-three/fiber`.
- Rendering components (`Enemy`, `Tower`, `Projectile`) are pure views derived from `GameState` arrays; the loop mutates state via safe functional updates.

## Concurrency & state

- Use functional updates for arrays (`setEnemies(prev => ...)`) to avoid race conditions inside the loop.
- Treat state objects immutably when exposing them to render code; make shallow copies when altering values.

## Extension points

- `TOWER_CONFIGS` and `ENEMY_TYPES` in `src/constants.ts` are the primary extension surfaces for gameplay balancing.
- Add new tower visuals in `src/game/GameCanvas.tsx` only when needed; otherwise prefer config-driven behavior.

## Testing & validation

- Unit tests live under `tests/` and run with Vitest (see `vitest.config.ts`).
- Prefer small, deterministic tests for core logic (range checks, damage calculations, pathfinding). GUI and 3D rendering get manual or integration tests.
