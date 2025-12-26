# TASK010 - Implement Tech Tree UI

## Status

- [x] Design (DESIGN008)
- [x] Implementation
- [x] Verification

## Steps

1. Modify `uiReducer` to support persistent meta-state (preserve RP/Upgrades on restart).
2. Update `GameState` to expose `factoryReset` and handle the reducer action.
3. Refactor `TechTreeModal` for reusability (props for onClose, onAction).
4. Update `IdleScreen` and `UI` to integrate Tech Tree access.
5. Verify with automated tests and Playwright script.
