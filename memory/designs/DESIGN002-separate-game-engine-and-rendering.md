# DESIGN002 — Separate Game Engine Logic from Rendering

**Status:** Active  
**Added:** 2025-12-12  
**Updated:** 2025-12-12  
**Owner:** AI-assisted refactor proposal  

## Summary

This design proposes a refactor that separates deterministic gameplay logic (“engine”) from React + R3F rendering and input wiring (“view”).

The key idea is to introduce a pure, testable engine module driven by reducers. Each tick produces `{ patch, events }` (with immediate vs deferred events), and adapters apply those results to React state and UI/gameflow.

## Goals

- Make core game logic runnable and testable without React or `@react-three/fiber`.
- Reduce coupling between UI components and raw state setters.
- Preserve current gameplay behavior and visuals.
- Enable future performance work (profiling, memoization, batching updates) within a clear boundary.

## Non-Goals

- Rewriting rendering/visuals (instancing, materials, postprocessing).
- Changing gameplay rules or balancing.
- Introducing networking or server-authoritative simulation.
- Full migration to a new state management library (e.g., Redux/XState) in this iteration.

## Current State (Observations)

- Rendering is already mostly separated into `src/game/components/*`.
- Gameplay logic is spread across:

  - Frame orchestration: `src/game/components/GameLoop.tsx` (`GameLoopBridge` using `useFrame`)
  - Logic hooks: `src/game/hooks/useEnemyBehavior.ts`, `useTowerBehavior.ts`, `useProjectileBehavior.ts`, `useWaveManager.ts`
- The Game Context (`src/game/GameState.tsx`) currently exposes raw setters (e.g. `setEnemies`, `setProjectiles`) which makes it easy for view code to “reach into” logic concerns.

## Requirements (EARS)

1. WHEN the render loop ticks, THE SYSTEM SHALL compute gameplay updates using pure engine functions and apply them to state without requiring React or R3F inside the engine.  
   **Acceptance:** Engine functions import no React/R3F modules; unit tests can execute them in Node.

2. WHEN gameplay behavior is unchanged, THE SYSTEM SHALL keep the same outcomes (enemy movement, tower firing, projectile collisions, wave progression) as before.  
   **Acceptance:** Existing unit tests pass; add engine-level tests covering representative scenarios.

3. WHEN UI components render entities, THE SYSTEM SHALL not require UI components to call raw `set*` entity setters to implement gameplay updates.  
   **Acceptance:** No gameplay-step mutations occur inside presentational components; only actions/events originate there.

4. WHEN the game is started/reset/advanced, THE SYSTEM SHALL perform orchestration through explicit actions rather than ad hoc state setter usage in view code.  
   **Acceptance:** Context exposes actions; tests verify start/reset/next-sector behavior.

## Finalized Decisions

- **State model:** Use two reducers:

  - `engineReducer` owns deterministic simulation state (enemies/towers/projectiles/waves) and engine bookkeeping.
  - `uiReducer` owns UI/gameflow state (money, lives, selection, menus, win/lose state).

- **Engine tick contract:** Engine tick returns `{ patch, events }` where:

  - `events.immediate[]` MUST be applied in the same tick.
  - `events.deferred[]` MUST be stored as `pendingEvents` and applied at the start of the next tick.

- **Pending events:** `EngineState` includes `pendingEvents` so any deferral is explicit and deterministic (replacing current `setTimeout(..., 0)`-style ordering hacks).

- **Deterministic IDs:** Engine-generated entities use deterministic counters (e.g., `idCounters.enemy`, `idCounters.projectile`, `idCounters.effect`) instead of `Math.random()`.

- **RNG injection:** Engine tick accepts `rng: () => number`. The adapter passes `Math.random` by default; tests can pass a seeded/deterministic RNG.

- **Wave extraction:** The wave subsystem produces `SpawnDescriptor[]` (not full `EnemyEntity`), plus gameflow events as needed.

- **No `three` types in engine state:** Engine state stores grid/path progress (e.g., waypoint index + segment progress). Rendering positions are derived via selectors.

- **Helper maps live outside the engine:** Any convenience maps (e.g., `enemyById`) are built in adapters/selectors and passed in as derived inputs if needed.

- **No raw setters exported from context:** React context exposes actions/dispatch, not `setEnemies`/`setProjectiles`/etc.

- **Renderer owns effect cleanup:** Engine can emit “spawn effect” intents/events. Effects are removed by the renderer by dispatching `removeEffect(effectId)` (not by mutating state via raw setters).

- **Single play gate:** The render loop bridge uses `gameState.isPlaying` as the authoritative gate for stepping.

## Proposed Architecture

### Layering

- **Engine (new):** Pure functions with no React/R3F. Input: current state snapshot + time delta. Output: patch describing changes.
- **Adapters (React hooks):** Translate between React state setters and engine patches.
- **View (R3F components):** Rendering only; emits user intents (place tower, select tower, etc.) to actions.

### Modules

Create a new folder:

- `src/game/engine/`
  - `types.ts` (optional): Engine-local patch types; avoid circular imports.
  - `enemy.ts`: movement + ability ticking, life loss calculation.
  - `tower.ts`: targeting + projectile spawning.
  - `projectile.ts`: projectile progress + hit aggregation.
  - `wave.ts`: spawn progression; wave state updates.
  - `step.ts` (or `engine.ts`): compose all subsystem updates into one “tick”.

Keep:

- `src/game/hooks/*`: remain adapters; minimal logic.
- `src/game/components/*`: render-only.

### Data Flow Diagram

```mermaid
flowchart LR
  Frame[useFrame tick] --> Bridge[GameLoopBridge]
  Bridge -->|if gameState.isPlaying| DispatchTick[dispatch engine tick]

  DispatchTick --> EngineReducer[engineReducer]
  EngineReducer -->|EngineResult| PatchAndEvents[{ patch + events }]

  PatchAndEvents --> ApplyPatch[apply engine patch]
  PatchAndEvents --> ApplyImmediate[apply immediate events]
  PatchAndEvents --> StoreDeferred[store deferred as pendingEvents]

  ApplyPatch --> EngineState[(EngineState)]
  StoreDeferred --> EngineState

  ApplyImmediate --> UIReducer[uiReducer]
  UIReducer --> UIState[(UIState)]

  EngineState --> Selectors[selectors derive render state]
  Selectors --> View[R3F render components]

  View -->|intents| UIActions[dispatch ui actions]
  UIActions --> UIReducer
```

## Interfaces

### Engine Inputs

Engine functions accept plain data and injected dependencies.

Illustrative tick input:

- `nowMs: number`
- `deltaMs: number`
- `rng: () => number`
- `static: { pathWaypoints, tileSize, towerConfigs, enemyTypes }`
- `derived: { enemyById?, towerById? }` (optional helper maps built outside engine)

### Engine Result

The engine tick returns `{ patch, events }`:

- `patch`: structural simulation updates (entities + wave state + counters).
- `events.immediate[]`: applied to UI/gameflow in the same tick.
- `events.deferred[]`: stored as `pendingEvents` for next tick.

### Patch Model

Prefer patch return values rather than calling React setters from the engine.

Example patch shape (illustrative):

- `EnginePatch = {`
  - `enemies?: EngineEnemy[]`
  - `towers?: EngineTower[]`
  - `projectiles?: EngineProjectile[]`
  - `wave?: EngineWaveState`
  - `idCounters?: EngineIdCounters`
  - `pendingEvents?: EngineEvent[]`
- `}`

Event examples:

- immediate: `MoneyAwarded`, `LivesLost`, `EnemyKilled`, `WaveStarted`
- deferred: `ApplyRewards`, `CommitKillEffects` (used to replace prior async deferrals)

### Adapter Contract

A single adapter hook applies patches:

- `useGameLoop({ stateSnapshot, setters, nowProvider, delta })`
- Or: `dispatchEngineTick(delta, now)` if using `useReducer`.

### Selector Contract

Selectors derive render-only shapes from engine state:

- `selectEnemyWorldPosition(engineEnemy, pathWaypoints, tileSize) -> { x, y, z }`
- `selectProjectileWorldPosition(engineProjectile) -> { x, y, z }`

Engine state MUST NOT store `THREE.Vector3`.

## Key Design Decisions

### D1: Keep `useFrame` usage confined to a bridge

- `GameLoopBridge` (or a new `useGameLoop`) remains the only place that sees `useFrame`.
- Rationale: easier to test and reason about time progression.

### D2: Eliminate `setTimeout` in logic (target)

- Current projectile logic uses `setTimeout(..., 0)` to batch updates.
- Replace with patch-based updates so all consequences are applied deterministically in the tick.
- Rationale: removes async ordering hazards and makes simulation deterministic.

### D3: Reduce exposure of raw setters

- `GameContext` should prefer actions (`placeTower`, `startGame`, `resetGame`, `applyEnginePatch`) rather than exporting `setEnemies`, etc.
- Rationale: prevents view code from becoming gameplay code.

## Migration Plan (Incremental)

### Phase 1 — Extract pure functions

- Create `src/game/engine/*` and move core calculations from:
  - `useEnemyBehavior.updateEnemies` → `engine/enemy.ts`
  - `useTowerBehavior.updateTowers` → `engine/tower.ts`
  - `useProjectileBehavior.updateProjectiles` → `engine/projectile.ts`
- Keep existing hook APIs by delegating to engine functions.

### Phase 2 — Introduce composed `step`

- Implement `engine/step.ts` to:
  1) wave update/spawns
  2) enemy move/life loss
  3) tower targeting/spawn projectiles
  4) projectile resolve hits/rewards/effects
  5) return a single patch

### Phase 3 — Adapter + context cleanup

- Add `src/game/hooks/useGameLoop.ts` that:
  - reads current context state
  - calls `engine.step` each frame
  - applies returned patches
- Update `GameState.tsx` context value to:
  - expose actions and a single patch apply function
  - stop exporting raw setters to view components

### Phase 4 — Component cleanup

- Ensure `src/game/components/*` do not mutate gameplay via raw setters.
- Keep purely presentational state (e.g., local hover in tiles) in components.

## Known Constraints (From Current Code)

- Current entity types embed `THREE.Vector3` positions; migration requires introducing engine-friendly position/progress fields plus selectors.
- Wave logic currently uses randomness (`Math.random()`); with `rng` injection, tests can be deterministic while gameplay can keep default randomness.
- Effects are currently removed from the renderer side; to remove raw setter exposure, effect removal becomes a UI action (`removeEffect(effectId)`).

## Testing Strategy

### Unit tests (Vitest)

Add tests for engine modules:

- Enemy movement progression and end-of-path life loss.
- Tower targeting chooses closest in range; respects cooldown.
- Projectile hits apply shield then HP; kills award money and spawn effects.
- Wave manager spawns enemies at expected intervals.

### Integration tests

- `engine.step` produces a correct combined patch in a representative scenario.

### Regression validation

- Run existing tests under `src/tests/**` and `tests/**`.

## Error / Edge Case Matrix

- **Enemy reaches end of path:** engine reports `livesLost`; adapter updates `gameState.lives` and transitions to `gameover` if needed.
- **Projectile target missing:** engine removes projectile or marks it inactive; no rendering glitch.
- **Wave progression while game paused:** adapter should not call engine step when not `playing`.
- **Large entity counts:** engine functions remain O(N) or O(N log N); avoid per-projectile linear enemy lookups where possible.

## Rollout & Backout

- Each phase should be shippable with tests passing.
- Backout is possible by reverting adapter and restoring hook-internal logic.

## Open Questions

- Do we want a default seeded RNG mode for replays/debug, or keep `Math.random` as the standard adapter-provided RNG?
