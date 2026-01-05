# DESIGN025 — GameState Refactor to Zustand Stores

**Status:** Draft
**Updated:** 2026-01-05

## Summary
Split the monolithic GameState React reducer into smaller Zustand stores (runtime, render state, game speed) while preserving the public hook API and provider guard behavior.

## Goals
- Reduce the coupling and size of `GameState.tsx` by isolating runtime state management in a dedicated store.
- Keep render-only data (`renderStateRef`) in its own store to avoid mixing with gameplay state.
- Preserve existing hook contracts (`useGame`, `useGameUi`, `useWorld`, `useRenderState`) so consuming components do not change.

## Architecture
- **Runtime Store:** Holds `{ engine, ui }` plus a `dispatch` function backed by the existing runtime reducer.
- **Render Store:** Holds `renderStateRef` only; created once and shared by render components.
- **Game Speed Store:** Holds `gameSpeed` and `setGameSpeed` for simulation speed control.
- **Provider Wiring:** `GameProvider` creates the stores once (via `createStore`) and feeds existing contexts with derived values and action callbacks.

## Data Flow
1. `GameProvider` initializes the three stores and selects the current runtime state via `useStore`.
2. UI actions and engine runtime actions call `dispatch`, which applies the existing runtime reducer.
3. `step` uses the latest runtime snapshot + game speed and writes to `renderStateRef` during sync.
4. Derived entities (`enemies`, `towers`, `projectiles`, `effects`) are memoized from runtime state in the provider as before.

## Interfaces
- `RuntimeStoreState`:
  - `runtime: { engine: EngineState; ui: UiState }`
  - `dispatch(action: RuntimeAction): void`
- `RenderStateStoreState`:
  - `renderStateRef: MutableRefObject<RenderState>`
- `GameSpeedStoreState`:
  - `gameSpeed: number`
  - `setGameSpeed(speed: number): void`

## Risks & Mitigations
- **Store recreation on re-render:** Use `useRef` to create stores once per provider.
- **Hook API regressions:** Keep existing contexts and ensure hooks still throw outside the provider.
- **Behavior drift:** Retain the current runtime reducer and dispatch semantics unchanged.

## Verification Plan
- Run unit tests for `GameState` and persistence hooks (`tests/game/*`).
- Smoke-test gameplay loop: tower placement, wave progression, and save/load.
