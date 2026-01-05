# DESIGN026 - Refactor monolithic modules

**Status:** Active
**Date:** 2026-01-05

## Overview

Split the largest files into cohesive modules to reduce complexity, improve testability, and make engine/render/UI boundaries clearer.

## Goals

- Extract well-scoped hooks/helpers from `src/game/GameState.tsx`.
- Split `src/components/ui/SettingsModal.tsx` into small sections with a shared state hook.
- Split `src/game/persistence.ts` into focused modules (types, migration, storage, runtime rebuild).
- Preserve current behavior and keep hot-path performance intact.

## Non-Goals

- Changing gameplay logic, UI layout, or save schema.
- Introducing new external dependencies.

## Proposed Module Boundaries

### GameState

- `src/game/hooks/useGameStores.ts`
  - Store refs, `ensureStoreRef`, and store bindings.
- `src/game/hooks/useAutosaveCheckpoint.ts`
  - Autosave effect tied to `waveStartedNonce`.
- `src/game/hooks/useDerivedEntities.ts`
  - `mapGrid`, `pathWaypoints`, `enemyTypeMap`, `enemiesById`, entity transforms.
- `src/game/hooks/useGameActions.ts`
  - Tower actions, UI actions, checkpoint actions, quality changes, announcement clear.
- `src/game/hooks/useGameStep.ts`
  - Engine step loop, audio events, kill-streak logic, render state sync.
- `src/game/contextValueBuilders.ts`
  - `buildGameContextValue`, `buildGameUiValue`, `buildWorldValue`, `buildRenderStateValue`.

### Settings Modal

- `src/components/ui/settings/useExportImportState.ts`
  - Import/export state and handlers.
- `src/components/ui/settings/SettingsAudioSection.tsx`
- `src/components/ui/settings/SettingsQualitySection.tsx`
- `src/components/ui/settings/SettingsExportImportSection.tsx`
- `src/components/ui/settings/SettingsResetSection.tsx`

### Persistence

- `src/game/persistence/types.ts`
  - `SaveV1`, `MigrateResult`, constants.
- `src/game/persistence/serialize.ts`
  - `serializeCheckpoint`.
- `src/game/persistence/validation.ts`
  - `validateSave`.
- `src/game/persistence/migrate.ts`
  - `migrateSave` and coercion helpers.
- `src/game/persistence/storage.ts`
  - `saveCheckpoint`, `loadCheckpoint`, `clearCheckpoint`.
- `src/game/persistence/runtime.ts`
  - `buildRuntimeFromCheckpoint`.
- `src/game/persistence/index.ts`
  - Re-exports.

## Data Flow

- GameState continues to source runtime data from zustand stores and expose context values.
- Settings Modal pulls state/actions from `useGame` and `useAudio` but delegates rendering to small sections.
- Persistence modules remain pure and UI-independent.

## Risks and Mitigations

- **Ref churn:** Keep exports stable via `index.ts` re-exports.
- **Render staleness:** Preserve `renderStateRef` access in GameState.
- **Autosave sync:** Keep `useEffect` ordering and checkpoint refresh logic.

## Validation Plan

- Run existing unit tests (`npm run test`) if possible.
- Manual smoke: open settings modal, export/import, reset checkpoint, and play a wave.
