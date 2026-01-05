# TASK019 - Extend Upgrades Support in Engine

**Status:** Pending  
**Added:** 2026-01-05

## Original request
Extend engine `stepTowers` and `GameState` to apply upgrade multipliers (range, damage, cooldown) deterministically and persistently across saves.

## Implementation plan
- Add `upgrades` map to `GameState` and wire into relevant selectors.
- Update `stepTowers` logic to account for upgrades when computing target checks and cooldowns.
- Add unit tests verifying upgrade effects and save/load persistence.

## Acceptance criteria
- Upgrade effects are applied in simulations and persist across save/load.
- Tests demonstrate deterministic behavior.

**Related commits:** a3a4feb
