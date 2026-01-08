# TASK021 - Document currentMapIndex and Map Management

**Status:** Pending  
**Added:** 2026-01-05

## Original request

Document the addition of `currentMapIndex` in `GameProvider` and `World`, and add tests for switching maps.

## Implementation plan

- Add `DESIGN024` design (map indexing) and note upgrade path for future map-specific mods.
- Add unit tests to assert map switching updates the visible map and resets placement validation.
- Update `memory/activeContext.md` and `memory/progress.md` to note the change.

## Acceptance criteria

- Test coverage ensures map switching behaves as expected.
- Documentation in `memory/designs/DESIGN024-current-map-index.md` exists.

**Related commits:** 4505500
