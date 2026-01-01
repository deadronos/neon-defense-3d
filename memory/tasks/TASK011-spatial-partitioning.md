# Task: Implement Spatial Partitioning for Targeting

## Status
- [ ] Create `src/game/engine/spatial.ts` with grid generation and query logic.
- [ ] Create unit tests for `spatial.ts` in `src/game/engine/tests/spatial.test.ts`.
- [ ] Integrate spatial grid into `stepTowers` in `src/game/engine/tower.ts`.
- [ ] Verify game logic (towers still shooting correctly).

## Details

### 1. Spatial Helper
Implement `buildSpatialGrid` and `getNearbyEnemies` in `src/game/engine/spatial.ts`.
- The grid should be a 1D array of arrays for performance, indexed by `z * width + x`.
- Input: List of enemies, map dimensions.
- Output: The grid structure.

### 2. Update `stepTowers`
- Import `buildSpatialGrid` and `getNearbyEnemies`.
- At start of `stepTowers`:
  - Compute map dimensions (from constants or inferred).
  - Call `buildSpatialGrid`.
- Inside tower loop:
  - Instead of iterating `state.enemies`, iterate results from `getNearbyEnemies`.

### 3. Tests
- Test that enemies are buckets correctly.
- Test that querying a range returns enemies in neighbor cells.
- Test boundary conditions (enemies at 0,0 or max bounds).

## Dependencies
- `src/constants.ts` for default map size if needed, though we should try to pass it dynamically or use `options`.
- `src/game/engine/selectors.ts` for enemy position calculation.
