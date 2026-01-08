# DESIGN024 - Map Indexing & Current Map State

**Summary:**
Add `currentMapIndex` into `GameProvider` and `World` to centralize which map layout is active and support map switching and map-specific state (e.g., spawn points, tile variants).

**Motivation:**
Better map management enables map selection UI, map-specific metrics, and future features like map-based modifiers.

**Implementation notes:**

- Add `currentMapIndex` field to `GameState` and expose setters via `GameProvider`.
- Ensure `World` consumes the index and picks the correct layout from `MAP_LAYOUTS`.
- Add tests for map switching and reinitialization.

**Acceptance criteria:**

- Switching `currentMapIndex` updates the visible map and resets or migrates necessary state.
- Tests cover map change behavior.

**Related commits:**

- 4505500
