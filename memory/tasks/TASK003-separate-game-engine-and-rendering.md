# TASK003 — Separate Game Engine and Rendering

**Status:** In Progress — Phase 1 scaffolding
**Added:** 2025-12-12
**Updated:** 2025-12-12

## Original Request

Create a refactor plan to separate gameplay logic from rendering and React wiring by introducing a pure engine layer and thin adapter hooks.

## Background / Context

Design reference: `DESIGN002 — Separate Game Engine Logic from Rendering`.

Current code already has partial separation:

- Rendering: `src/game/components/*`
- Per-frame orchestration: `src/game/components/GameLoop.tsx` (`GameLoopBridge`)
- Behavior logic: `src/game/hooks/useEnemyBehavior.ts`, `useTowerBehavior.ts`, `useProjectileBehavior.ts`, `useWaveManager.ts`
- State/context: `src/game/GameState.tsx` (currently exposes raw setters)

## Requirements (Acceptance)

1. Engine modules are pure (no React/R3F imports) and are unit-testable.
2. Existing gameplay behavior remains unchanged (existing tests pass).
3. Rendering components do not implement gameplay stepping; stepping occurs in one bridge/adaptor.
4. The runtime uses an `engineReducer` + `uiReducer` split and a deterministic `{ patch, events }` engine tick contract.
5. Engine tick uses injected `rng: () => number` and deterministic ID counters (no `Math.random()` IDs).
6. Deferred consequences are represented explicitly via `pendingEvents` (no `setTimeout(..., 0)` ordering hacks).
7. Engine state stores grid/path progress; selectors derive world positions (no `three` types in engine state).
8. Context API shifts toward actions/dispatch (no raw entity setters exported).
9. Effects are removed by renderer intent: renderer dispatches `removeEffect(effectId)`.

## Implementation Plan

This task will be implemented as two PRs.

### PR1 — Contracts + Reducer Scaffolding

**Outcome:** Specs are executable in code: reducers + event model + selectors exist, but gameplay behavior may still be driven by existing hooks while wiring is stabilized.

- Add engine contracts:

  - `engineReducer` state shape including `pendingEvents` + deterministic `idCounters`.
  - `EngineResult = { patch, events: { immediate, deferred } }`.
  - Tick dependency injection (`rng`, `nowMs`, `deltaMs`).

- Add UI contracts:

  - `uiReducer` for gameflow/economy/selection.
  - `removeEffect(effectId)` action (renderer dispatches; no raw setter).

- Introduce selectors:

  - Derive render positions from engine path/grid progress.
  - Ensure engine state does not store `three` types.

- Add initial engine unit tests:

  - Deterministic ID counters.
  - Deferred events stored as `pendingEvents` and processed next tick.
  - `rng` injection produces deterministic outcomes under test.

### PR2 — Gameplay Migration + Context Hard Cut

**Outcome:** The render loop steps the simulation via reducer dispatch, and context no longer exports raw entity setters.

- Migrate wave/enemy/tower/projectile logic into engine tick + reducer.
- Replace any `setTimeout(..., 0)` ordering with deferred events + `pendingEvents`.
- Update `GameLoopBridge` to step only when `gameState.isPlaying`.
- Switch context exports to actions/dispatch only; remove `setEnemies`/`setProjectiles`/etc from public context.
- Update R3F components to use selectors and dispatch intents (including `removeEffect`).

## Progress Tracking

**Overall Status:** In Progress — 35%

### Subtasks

| ID  | Description | Status | Updated | Notes |
| --- | ----------- | ------ | ------- | ----- |
| 0.1 | Baseline test run + notes | Done | 2025-12-12 | `npm test` (vitest) ✅ |
| 1.1 | Define engine tick result + event taxonomy | Done | 2025-12-12 | Added engine events/contracts scaffolding. |
| 1.2 | Add `pendingEvents` + deterministic `idCounters` | Done | 2025-12-12 | `EngineState` stores counters + helpers to promote deferred events. |
| 1.3 | Add `rng` injection + deterministic test RNG | Done | 2025-12-12 | Introduced `createDeterministicRng` utility with tests. |
| 1.4 | Add selectors for world positions | Done | 2025-12-12 | Pure selectors derive world coordinates without `three`. |
| 1.5 | Add UI action `removeEffect(effectId)` | Done | 2025-12-13 | Reducer exposes remove-effect path + tests. |
| 2.1 | Migrate wave/enemy/tower/projectile into engine reducer tick | Not Started | 2025-12-12 | |
| 2.2 | Remove `setTimeout` ordering via deferred events | Not Started | 2025-12-12 | |
| 2.3 | Hard cut context exports (dispatch/actions only) | Not Started | 2025-12-12 | |
| 2.4 | Update components to use selectors + dispatch intents | Not Started | 2025-12-12 | |

## Risks / Notes

- Ordering changes are expected and must be captured explicitly via immediate vs deferred events and `pendingEvents`.
- Current entity types embed `THREE.Vector3`; migration requires selectors and a new engine state representation.
- Wave spawning currently uses randomness; `rng` injection enables deterministic tests, and optional seeded RNG can enable replays/debug determinism.

## Validation Plan

- Run targeted unit tests for engine.
- Run existing test suite.
- Optional: run e2e screenshot tests to ensure visuals don’t regress.
