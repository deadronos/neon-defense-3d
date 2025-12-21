# TASK008 - Implement Settings Modal + Tier‑B Save/Load/Reset with Wave Autosave

**Status:** Pending  
**Added:** 2025-12-21  
**Updated:** 2025-12-21

## Original Request

Add a wrench Settings modal (moving Quality inside) and implement Export/Import/Reset features. Persist Tier‑B checkpoints (towers + wave + economy + meta), autosaved on each `WaveStarted`. Reset Checkpoint reloads last checkpoint; Factory Reset wipes progress/meta (Quality unchanged). Import performs best‑effort migration and shows non-blocking warnings.

## Thought Process

- Use event-driven autosave keyed on `WaveStarted` to avoid per-frame work and capture wave 1.
- Keep saves small and stable; exclude ephemeral engine entities/events.
- Prevent exploit loops by restoring economy+towers wholesale when resetting a checkpoint.
- Migration should drop/normalize invalid parts but proceed when safe; warnings appear in UI.

## Implementation Plan

1. UI Entry: Replace Quality button with wrench in `src/components/ui/TopBar.tsx`; add `SettingsModal.tsx` patterned after `TechTreeModal`.
2. Persistence helpers: Create `src/game/persistence.ts` with `serializeCheckpoint`, `migrateSave`, `validateSave`, `saveCheckpoint`, `loadCheckpoint`, `applyCheckpoint`.
3. Autosave hook: In `engine/runtime.applyTickResult` ensure `WaveStarted` marker is recorded by reducer; in `GameState`, add `useEffect` to autosave when the marker changes; guard with `isImporting/isRestoring`.
4. Reset actions: Implement `resetCheckpoint()` reading latest checkpoint and applying it; reuse existing `resetGame()` for factory reset.
5. Export/Import UI: Export as JSON (copy/download); import from paste/file; show warnings/errors; confirm before destructive apply.
6. Validation & Tests: Vitest unit tests for migration, autosave trigger, import/load, and both reset paths; optional Playwright assertions for modal.

## Progress Tracking

**Overall Status:** Not Started — 0%

### Subtasks

| ID | Description | Status | Updated | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Replace Quality button with wrench Settings entrypoint | Pending | 2025-12-21 | TopBar integration |
| 1.2 | Implement `SettingsModal` with three sections | Pending | 2025-12-21 | Pattern after TechTreeModal |
| 2.1 | Implement `persistence.ts` serialize/migrate/validate/save/load | Pending | 2025-12-21 | Tier‑B schema |
| 3.1 | Record `WaveStarted` marker in reducer/runtime | Pending | 2025-12-21 | Pure marker only |
| 3.2 | Add autosave `useEffect` with guards in `GameState` | Pending | 2025-12-21 | Suppress during import/reset |
| 4.1 | Implement `resetCheckpoint()` | Pending | 2025-12-21 | Disabled if none exists |
| 4.2 | Wire Factory Reset via existing `resetGame()` | Pending | 2025-12-21 | Quality unchanged |
| 5.1 | Export UI: copy clipboard + download file | Pending | 2025-12-21 | - |
| 5.2 | Import UI: paste/upload, warnings list, confirm apply | Pending | 2025-12-21 | - |
| 6.1 | Unit tests for migration/validation/autosave/reset | Pending | 2025-12-21 | Vitest |
| 6.2 | Optional Playwright tests for modal interactions | Pending | 2025-12-21 | - |

## Progress Log

### 2025-12-21

- Created plan, design (DESIGN006), and this implementation task. Awaiting execution.
