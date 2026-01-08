# TASK018 - Add Synergy System

**Status:** Pending  
**Added:** 2026-01-05

## Original request

Implement tower synergies and a `SynergyLinks` visualization component to show active synergies.

## Implementation plan

1. Add detection logic (deterministic) and store in `GameState.activeSynergies`.
2. Implement `SynergyLinks` rendering (instanced lines) and ensure it is cheap to compute per frame.
3. Add unit tests for detection logic and basic effect changes (e.g., rate-of-fire/bonus range).

## Acceptance criteria

- Active synergies are present in the game state and update correctly when towers are placed/removed.
- Visual links are present and update with minimal performance impact.
- Tests cover core detection logic and one example synergy.

**Related commits:** 6bb1181
