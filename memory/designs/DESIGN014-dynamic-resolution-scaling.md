# DESIGN014 - Dynamic Resolution Scaling

**Status:** Draft  
**Created:** 2026-01-02  
**Owner:** AI Agent (Codex)  
**Related Requirements:** `memory/requirements.md` (Dynamic Resolution Scaling)

## Overview

Add a lightweight R3F component that monitors frame rate and adjusts DPR at runtime. The scaler should react to sustained FPS changes while clamping DPR to safe bounds.

## Architecture

- `DynamicResScaler` lives under `src/game/components/`.
- Mounted inside the main `Canvas` in `src/game/GameCanvas.tsx`.
- Uses `useFrame` to sample FPS and `useThree().setDpr` to apply changes.

## Data Flow

```
useFrame -> frameCount/elapsed -> FPS estimate
FPS -> compare against target range -> next DPR
next DPR -> clamp -> setDpr
```

## Interfaces

### `DynamicResScaler`

No props for v1. Internal constants control tuning:

- `TARGET_FPS`
- `FPS_TOLERANCE`
- `CHECK_INTERVAL_MS`
- `MIN_DPR`
- `MAX_DPR`
- `STEP`

## Error Handling / Edge Cases

- If `window` is unavailable, `MAX_DPR` defaults to `1`.
- DPR updates are clamped to `[MIN_DPR, MAX_DPR]`.

## Testing Strategy

- Manual verification in dev: observe console logs (dev-only) and verify DPR adjusts when FPS changes.
- Optional future unit test: extract FPS sampling and DPR decision logic into a pure helper.
