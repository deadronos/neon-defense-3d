# DESIGN004 - Cryo Tower (Status Effects)

## Goal

Implement a status effect system, specifically a "Slow/Freeze" effect, and a new "Cryo" tower that utilizes it. This will add strategic depth by allowing players to control enemy crowd flow.

## Architecture

### 1. Engine State Updates

The `EngineEnemy` interface already contains a `frozen?: number` property. We will utilize this to track the duration of the slow effect.

- **Status Logic:**
  - If `frozen > 0`, the enemy's speed is reduced by a fixed factor (e.g., 50%).
  - `frozen` is a timer that decrements by `deltaSeconds` each tick.

### 2. Projectile Updates

We need a way for projectiles to apply this effect.

- Add `statusEffect?: { type: 'freeze', duration: number }` to `EngineProjectile` (or similar mechanism).
- Or, since we only have one effect for now, we can add `freezeDuration?: number` to `EngineProjectile`.

### 3. Tower Configuration

- Add `TowerType.Cryo`.
- Add config to `TOWER_CONFIGS`:
  - Name: "Cryo Projector"
  - Color: Cyan/Blue
  - Effect: Applies 2s slow on hit.

### 4. Engine Logic (`stepEnemies`, `stepProjectiles`)

- **`stepEnemies`:** Check `frozen` timer. If active, multiply speed by `0.5`. Decrement timer.
- **`stepProjectiles`:** When a projectile hits, if it has `freezeDuration`, set `enemy.frozen = Math.max(enemy.frozen, duration)`.

### 5. Visuals

- Enemies with `frozen > 0` should be tinted blue.

## Detailed Design

### Data Structures

```typescript
// src/game/engine/types.ts

// Update EngineProjectile
export interface EngineProjectile {
  // ... existing fields
  freezeDuration?: number; // Duration in seconds to freeze target
}
```

### Logic Flow

1. **Tower Fires:**
   - `stepTowers` creates a projectile. If type is Cryo, it attaches `freezeDuration`.

2. **Projectile Hits:**
   - `stepProjectiles` detects collision.
   - If `freezeDuration` exists, update target enemy:
     ```typescript
     target.frozen = Math.max(target.frozen ?? 0, projectile.freezeDuration);
     ```

3. **Enemy Moves:**
   - `stepEnemies` calculates speed:
     ```typescript
     let speed = enemy.speed;
     if ((enemy.frozen ?? 0) > 0) {
       speed *= 0.5; // 50% slow
       enemy.frozen -= deltaSeconds;
     }
     ```

## Risks & Considerations

- **Balancing:** Perma-freeze might be too strong. 50% slow is a good start.
- **Performance:** Minimal impact. Just a few float operations.
