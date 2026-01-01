# TASK007 - Implement Missile Tower (AOE)

## Context

Based on [DESIGN005](../designs/DESIGN005-missile-tower-aoe-damage.md), we are implementing AOE damage logic to support a new Missile Tower.

## Requirements

1. **Engine Updates:**
   - Update `EngineProjectile` to support `splashRadius`.
   - Update `stepProjectiles` to handle area damage calculation on impact.

2. **Game Configuration:**
   - Add `TowerType.Missile`.
   - Add `Missile` tower configuration in `TOWER_CONFIGS`.

3. **Visuals:**
   - Spawn larger explosion effects for AOE hits.

## Implementation Steps

1. [ ] **Modify Engine Types:** Add `splashRadius` to `EngineProjectile` in `src/game/engine/types.ts`.
2. [ ] **Update Projectile Logic:** Modify `stepProjectiles` in `src/game/engine/projectile.ts`:
   - If `splashRadius` is present, loop through `state.enemies` to find targets in range.
   - Apply damage to all affected enemies.
3. [ ] **Add Tower Config:** Update `src/types.ts` (TowerType) and `src/constants.ts` (TOWER_CONFIGS).
4. [ ] **Verify:** Run game, build Missile tower, verify multiple enemies take damage from single shot.

## Acceptance Criteria

- [ ] Missile Tower can be built.
- [ ] Projectiles deal damage to multiple enemies when hitting a cluster.
- [ ] Visual explosion scale matches (roughly) the blast radius.
- [ ] Existing tests pass.
