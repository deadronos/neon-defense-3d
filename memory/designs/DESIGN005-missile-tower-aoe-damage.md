# DESIGN005 - Missile Tower (AOE Damage)

## Goal

Implement Area of Effect (AOE) damage mechanics and a new "Missile" tower. This allows projectiles to damage multiple enemies within a radius, providing a counter to high-density enemy waves.

## Architecture

### 1. Engine State Updates

- Add `splashRadius` to `EngineProjectile`.

### 2. Physics / Collision Logic

- Currently, collision is single-target based on `progress >= 1`.
- New logic:
  - When `progress >= 1` (impact):
    - If `splashRadius > 0`:
      - Iterate through all active enemies.
      - Calculate distance between enemy and impact point.
      - If `distance <= splashRadius`, apply damage.
    - Else (legacy):
      - Damage only the primary target.

### 3. Tower Configuration

- Add `TowerType.Missile`.
- Add config to `TOWER_CONFIGS`:
  - Name: "Missile Launcher"
  - Color: Orange/Red
  - Effect: AOE Damage (e.g., radius 3).
  - High cost, slow fire rate.

### 4. Visuals

- Trigger a larger explosion effect (already have `EffectEntity`, just need to scale it up or add a new type).

## Detailed Design

### Data Structures

```typescript
// src/game/engine/types.ts

export interface EngineProjectile {
  // ... existing
  splashRadius?: number; // Radius in world units
}
```

### Logic Flow (`stepProjectiles`)

1. **Impact Detection:**
   - Detect impact as usual (progress >= 1).

2. **Damage Calculation:**
   - If `projectile.splashRadius` is set:
     - Identify impact position (usually target's position or last known).
     - **Optimization:** Since we don't have a spatial partition grid in the pure engine yet, we simply iterate all enemies. $O(N)$ per impact is acceptable for current enemy counts (< 1000).
     - For each enemy, if `distance(enemy, impact) < splashRadius`, apply damage.

3. **Effects:**
   - Spawn an explosion effect with scale proportional to `splashRadius`.

## Risks & Considerations

- **Performance:** Iterating all enemies on every AOE impact could be slow if many missiles hit simultaneously with many enemies.
  - _Mitigation:_ We can pre-calculate enemy positions into a simple grid if needed, but for now linear scan is likely fine.
- **Friendly Fire:** Not applicable (towers don't take damage).
