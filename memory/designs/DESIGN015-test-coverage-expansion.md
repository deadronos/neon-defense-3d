# DESIGN015 - Test Coverage Expansion

**Status:** Draft  
**Created:** 2026-01-02  
**Owner:** AI Agent (Codex)  
**Related Requirements:** `memory/requirements.md` (Test Coverage Expansion)

## Overview

Add unit tests for dynamic DPR scaling, tower cooldown/targeting, projectile shield + freeze stacking, and runtime edge cases such as skip-wave and checkpoint export/reset behavior.

## Scope

- `DynamicResScaler` component (FPS-based DPR adjustment).
- Engine tower logic (cooldown + nearest target).
- Engine projectile logic (shield handling + freeze max).
- Runtime/GameState edge actions (skipWave, checkpoint export/reset).

## Architecture / Test Strategy

- Component tests: mock `@react-three/fiber` hooks to capture `useFrame` callbacks and `setDpr`.
- Engine logic tests: use deterministic states and tick contexts to validate patches/events.
- Runtime/GameState tests: use `applyEngineRuntimeAction` or `useGame` via `renderHook` to validate state changes.

## Test Matrix

| Area | Happy Path | Edge Case |
| --- | --- | --- |
| Dynamic DPR | DPR decreases when FPS is low | DPR clamps at min/max |
| Towers | Fires at nearest target | No fire during cooldown |
| Projectiles | Shield absorbs damage first | Freeze duration uses max |
| Runtime/GameState | Skip-wave shortens preparing timer | Checkpoint export/reset without save |

## Error Handling / Diagnostics

- Tests should assert no DPR changes are applied when already at bounds.
- Tests should use minimal state to keep deterministic outcomes.
