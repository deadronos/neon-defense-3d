# TASK006 - Implement Cryo Tower and Status Effects

## Context
Based on [DESIGN004](../designs/DESIGN004-cryo-tower-status-effects.md), we are implementing a status effect system to allow towers to slow down enemies.

## Requirements

1. **Engine Updates:**
   - Update `EngineProjectile` to support `freezeDuration`.
   - Update `stepEnemies` to process `frozen` timer and reduce speed.
   - Update `stepProjectiles` to apply `frozen` status on hit.

2. **Game Configuration:**
   - Add `TowerType.Cryo`.
   - Add `Cryo` tower configuration in `TOWER_CONFIGS`.

3. **Visuals:**
   - Render frozen enemies with a blue tint.

## Implementation Steps

1. [ ] **Modify Engine Types:** Add `freezeDuration` to `EngineProjectile` in `src/game/engine/types.ts`.
2. [ ] **Update Projectile Logic:** Modify `stepProjectiles` in `src/game/engine/projectile.ts` to apply status.
3. [ ] **Update Enemy Logic:** Modify `stepEnemies` in `src/game/engine/enemy.ts` to handle speed reduction and timer decrement.
4. [ ] **Add Tower Config:** Update `src/types.ts` (TowerType) and `src/constants.ts` (TOWER_CONFIGS).
5. [ ] **Update Visuals:** Modify `src/game/components/Enemies.tsx` (or `InstancedEnemies`) to use blue color for frozen state.
6. [ ] **Verify:** Run game, build Cryo tower, verify enemies slow down.

## Acceptance Criteria
- [ ] Cryo Tower can be built.
- [ ] Enemies hit by Cryo projectiles move at reduced speed (e.g. 50%) for the duration.
- [ ] Frozen enemies have a visual indicator (color change).
- [ ] Existing tests pass.
