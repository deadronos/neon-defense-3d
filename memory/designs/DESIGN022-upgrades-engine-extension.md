# DESIGN022 - Upgrades Support & Engine Extensions

**Summary:**
Extend engine step functions and game state to support upgrades that change tower behavior (range, damage, cooldown) in a deterministic way suitable for testing and replay.

**Motivation:**
Upgrades enable progression and deeper choices. Centralizing upgrade effects in the engine ensures consistent simulation across saves and replays.

**Implementation notes:**

- Add an `upgrades` map to `GameState` and ensure `stepTowers` consults upgrades for computed properties.
- Keep effect computation pure and testable; prefer numeric multipliers or additive offsets applied during the step.
- Add tests verifying upgrade application across save/load boundaries.

**Acceptance criteria:**

- Upgrades affect expected tower stats (range, cooldown, damage) deterministically.
- Save/load persists upgrade state and effects are reapplied after reload.

**Related commits:**

- a3a4feb (enhance upgrades support in engine step functions)
