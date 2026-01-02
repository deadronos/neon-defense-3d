# TASK011: Implement Game Speed Control

## 1. Description

Implement 1x, 2x, 4x game speed control to allow players to pace the game.

## 2. Requirements

- [ ] Add `gameSpeed` state to `GameProvider`.
- [ ] Expose `gameSpeed` and `setGameSpeed` in `GameContext`.
- [ ] Modify `step` function in `GameState.tsx` to account for `gameSpeed`.
  - _Technical Decision:_ To ensure stability, if `gameSpeed` > 1, we should loop the `stepEngine` call `gameSpeed` times (or similar) with the original delta, OR just scale the delta if the engine is robust.
  - Let's check `stepEngine` first. If it's robust, scaling delta is easier. If not, multiple steps.
- [ ] Add Speed Control UI to `TopBar`.
- [ ] Update `UI.tsx` to pass necessary props.

## 3. Step-by-Step Plan

1.  **Analyze Engine:** Check `src/game/engine/step.ts` to see how it handles large deltas.
2.  **Update Context:** Add `gameSpeed` to `GameContextProps` (in `src/game/contextTypes.ts`) and `GameProvider` (in `src/game/GameState.tsx`).
3.  **Implement Logic:** Update `step` in `GameState.tsx`.
4.  **Update UI:** Create/Modify `TopBar` components to include speed buttons.
5.  **Verify:** Manual test and unit test if applicable.

## 4. Verification

- **Manual:** Start game, click 2x, see enemies move faster. Click 4x, even faster. Click 1x, normal.
- **Automated:** UI test to ensure buttons exist and are clickable.
