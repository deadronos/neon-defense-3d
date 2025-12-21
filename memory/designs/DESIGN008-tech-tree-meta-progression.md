# DESIGN008 - Tech Tree & Meta Progression

## Overview
Implement a persistent Tech Tree where players spend Research Points (earned by winning waves) to unlock global upgrades (Damage, Range, Greed).

## Goals
- Provide long-term progression.
- Create a dedicated UI for spending Research Points.
- Ensure upgrades persist across game restarts (New Game).

## Architecture
- **State:** `uiReducer.ts` manages `researchPoints` and `upgrades`. `startGame` must be modified to NOT clear these.
- **Persistence:** Already handled by `persistence.ts` (SaveV1 schema includes RP and upgrades).
- **UI:**
    - `TechTreeModal.tsx`: The main interface.
    - `IdleScreen.tsx`: Entry point from main menu.
    - `VictoryPopup.tsx`: Entry point after sector clear.

## Implementation Details
1. **uiReducer Updates:**
    - `startGame` / `resetGame`: Preserve RP/Upgrades.
    - `factoryReset`: New action to clear everything (including persistent meta-data).
2. **Components:**
    - `TechTreeModal`: Reusable modal with Close/Action support.
    - `IdleScreen`: Add "RESEARCH LAB" button.
