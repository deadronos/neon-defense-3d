# Active Context

## Current focus

- Implementing new gameplay features: Cryo Tower and Missile Tower.
- Validating engine logic for status effects and AOE damage.

## Recent changes (code highlights)

- **New Towers:** Implemented **Cryo Tower** (Status Effects) and **Missile Tower** (AOE Damage).
- **Engine Logic:**
  - Updated `src/game/engine/projectile.ts` to support `splashRadius` (AOE) and `freezeDuration`.
  - Updated `src/game/engine/enemy.ts` to process `frozen` state (speed reduction).
  - Added impact visual effects for AOE projectiles.
- **Type Safety:** Defined `TowerConfig` interface in `src/types.ts` and applied it to `TOWER_CONFIGS`.
- **Docs:** Created Design and Task documents for the new features in `/memory`.
- **Tests:** Added unit tests for projectile AOE and enemy status effects.

## Next steps

- Do a manual gameplay parity pass (movement, firing cadence, rewards, victory after wave 10).
- Consider reducing per-frame allocations from deriving `THREE.Vector3` in selectors if performance/GC becomes an issue.
- Monitor runtime performance and reduce allocations in hot loops if GC pressure appears.

## Open decisions

- Visual fidelity vs. performance: whether to reintroduce expensive effects (trails, per-entity lights) via instancing or shaders.
- Sector/progression balancing: decide wave lengths and reward curves for persistent campaign progression.
