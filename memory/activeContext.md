# Active Context

## Current focus

- Implementing Tech Tree UI and Meta-Progression.

## Recent changes (code highlights)

- **Meta-Progression:** Updated `uiReducer.ts` to persist `researchPoints` and `upgrades` across runs.
- **UI:**
  - Implemented reusable `TechTreeModal` component.
  - Integrated Tech Tree access into `IdleScreen` and `UI.tsx`.
  - Added `factoryReset` to handle full state wipes.
- **New Towers:** Implemented **Cryo Tower** (Status Effects) and **Missile Tower** (AOE Damage).
- **Engine Logic:**
  - Updated `src/game/engine/projectile.ts` to support `splashRadius` (AOE) and `freezeDuration`.
  - Updated `src/game/engine/enemy.ts` to process `frozen` state (speed reduction).

## Next steps

- Do a manual gameplay parity pass (movement, firing cadence, rewards, victory after wave 10).
- Consider reducing per-frame allocations from deriving `THREE.Vector3` in selectors if performance/GC becomes an issue.
- Monitor runtime performance and reduce allocations in hot loops if GC pressure appears.

## Open decisions

- Visual fidelity vs. performance: whether to reintroduce expensive effects (trails, per-entity lights) via instancing or shaders.
- Sector/progression balancing: decide wave lengths and reward curves for persistent campaign progression.
