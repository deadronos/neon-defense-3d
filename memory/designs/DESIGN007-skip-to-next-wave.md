# Skip to Next Wave

## Context
Players sometimes finish a wave early and have to wait for the timer to count down before the next wave starts. This breaks the flow of gameplay.

## Requirements
- Allow players to skip the waiting period between waves.
- Show a "Skip" button only during the 'preparing' phase.
- Clicking the button should immediately start the next wave (or set timer to 0).

## Proposed Solution

### Engine
- Add a new `skipWave` action to `EngineRuntimeAction`.
- The `skipWave` action, when dispatched, will set `wave.timerMs` to 0 if the phase is `preparing`.
- The engine loop `stepWave` already handles transitioning to `spawning` when `timerMs <= 0`.

### State Management
- Expose `skipWave` function in `GameContext`.
- This function will dispatch the `{ type: 'skipWave' }` action to the engine runtime.

### UI
- Update `TopBar` to display a "SKIP [>>]" button when `waveState.phase === 'preparing'`.
- The button should be styled consistently with the neon aesthetic (e.g., Cyan/Magenta scheme).

## Test Plan
- Verify that `skipWave` action sets timer to 0 in a unit test.
- Verify clicking the button starts the next wave immediately in manual testing.
