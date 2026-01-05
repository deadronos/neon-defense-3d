# [TASK023] - Refactor monolithic modules

**Status:** Completed
**Added:** 2026-01-05
**Updated:** 2026-01-05

## Original Request

Refactor the three largest source files (`GameState.tsx`, `SettingsModal.tsx`, `persistence.ts`) into smaller modules or helpers.

## Thought Process

The current files bundle multiple responsibilities (state wiring, actions, effects, rendering selectors, UI sections, and persistence utilities). Extracting cohesive modules will reduce cognitive load, improve testability, and align with existing architecture patterns. The refactor should preserve current runtime behavior and avoid crossing engine/render boundaries.

## Implementation Plan

- [ ] Create a design doc that defines module boundaries and public APIs.
- [ ] Refactor `src/game/GameState.tsx` into hooks/helpers (actions, derived entities, engine step, context builders).
- [ ] Refactor `src/components/ui/SettingsModal.tsx` into UI sections and a shared state hook for import/export.
- [ ] Refactor `src/game/persistence.ts` into a folder with focused modules (types, migrate/validate, storage, runtime rebuild).
- [ ] Update imports/exports and ensure existing tests still pass.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID  | Description | Status | Updated | Notes |
| --- | ----------- | ------ | ------- | ----- |
| 1.1 | Draft design doc with module boundaries | Complete | 2026-01-05 | DESIGN026 |
| 1.2 | Split `GameState.tsx` into hooks/helpers | Complete | 2026-01-05 | New hooks + context builders |
| 1.3 | Split `SettingsModal.tsx` into sections/hooks | Complete | 2026-01-05 | Sections + import/export hook |
| 1.4 | Split `persistence.ts` into modules | Complete | 2026-01-05 | New persistence folder |

## Progress Log

### 2026-01-05

- Created task file and prepared plan for module splits.
- Added DESIGN026 and split GameState, SettingsModal, and persistence modules into focused files.
- Ran lint, typecheck, and unit tests to validate refactor.
