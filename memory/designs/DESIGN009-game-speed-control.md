# DESIGN009: Game Speed Control

## 1. Feature

Add a game speed control feature allowing players to switch between 1x, 2x, and 4x speed multipliers.

## 2. Context

Players need control over the pacing of the game, especially during easy waves or long path traversal times. This improves the user experience by allowing faster progression through mundane segments.

## 3. Proposal

- **Game State:** Add a `gameSpeed` (number) property to the `GameState` or `GameContext` (prefer `GameContext` or UI state since it's transient).
- **Engine Loop:** Modify the game loop (likely in `GameState.tsx` or `step` function) to multiply the `deltaMs` by the current `gameSpeed`.
- **UI:** Add controls to the `TopBar` to toggle between speeds.

## 4. Implementation Details

### GameContext

Extend `GameContextProps` to include:

- `gameSpeed`: number (default 1)
- `setGameSpeed`: (speed: number) => void

Since the game speed is a global setting that affects the simulation step but doesn't necessarily need to be persisted in the save file (or maybe it should be reset on load), we can keep it as React state in `GameProvider`.

### Game Loop

In `src/game/GameState.tsx`, inside the `step` function:

```typescript
const step = useCallback((deltaSeconds: number, nowSeconds: number) => {
    // ...
    const deltaMs = deltaSeconds * 1000 * gameSpeed; // Apply multiplier
    // ...
}, [gameSpeed, ...]);
```

### UI Components

- **TopBar:** Add a segmented control or a button cycle to switch speeds.
  - Visual indication of current speed.
  - Buttons for 1x, 2x, 4x.
  - Alternatively, a single button that cycles: 1x -> 2x -> 4x -> 1x.
  - Or distinct buttons like [▶] [▶▶] [▶▶▶].

  Let's go with distinct buttons or a compact segmented control to clearly show options. Given the visual style (skewed boxes), a new module in the TopBar for "Speed" would fit well.

### Data Flow

1.  User clicks speed button in `TopBar`.
2.  `TopBar` calls `setGameSpeed` from context (passed via props from `UI`).
3.  `GameProvider` updates `gameSpeed` state.
4.  `step` callback uses new `gameSpeed`.

## 5. Alternatives Considered

- **Engine-side speed:** We could pass speed into the engine state, but since it only affects the time step, it's cleaner to handle it at the `step` call injection point. The engine logic remains deterministic based on `deltaMs`.

## 6. Risks

- **Performance:** 4x speed means the simulation steps 4x larger (or more frequent steps). If `deltaMs` becomes too large, collision detection might tunnel.
  - _Mitigation:_ The engine likely uses `deltaMs` for movement. If `deltaMs` is simply multiplied, we are simulating a larger time jump. If the physics step is fixed or max-clamped, this might be an issue.
  - Check `src/game/engine/step.ts`. If it handles large deltas by subdividing, we are fine. If not, we might need to call `stepEngine` multiple times with smaller deltas if the multiplier is high, OR rely on the engine's internal handling.
  - Actually, simply multiplying `deltaMs` simulates "time passing faster". If the frame rate is 60fps, 1x is ~16ms. 4x is ~64ms. 64ms per frame might be large for bullet collision if not raycasted.
  - _Refinement:_ It is safer to run the engine step multiple times per frame if the speed is high, to maintain simulation stability. e.g. for 4x, run `stepEngine` 4 times with normal delta, or ensure `stepEngine` can handle large deltas safely.
  - Looking at `src/game/engine/step.ts` will be crucial.

## 7. Verification

- Playwright test to toggle speed and verify `deltaMs` or game progression speed (hard to measure timing exactly in e2e, but can check UI state).
- Manual verification: Watch enemies move faster.
