# Settings Modal + Wave Autosave Checkpoints + Export/Import/Reset (Tier B)

## Overview

This plan introduces a single wrench “Settings” entrypoint in the top-right UI that opens a modal with three sections: Quality toggle, Export/Import of JSON saves, and Reset actions. The game will autosave a Tier‑B checkpoint at every WaveStarted event (including wave 1). “Reset Checkpoint” reloads the last autosaved checkpoint. “Factory Reset” wipes all progress/meta but keeps the Quality setting. Import uses best‑effort migration and displays non-blocking warnings.

## Decisions

- UI: Replace current Quality button with a wrench Settings button; move Quality toggle into the modal.
- Persistence: Tier‑B saves (checkpoint = towers + wave-to-start + economy + meta upgrades); no enemies/projectiles/effects.
- Autosave: Save one checkpoint on every `WaveStarted` event.
- Reset Checkpoint: Reload the last autosaved checkpoint.
- Factory Reset: Wipe all progress/meta; retain Quality setting.
- Import: Best‑effort migration with non-blocking warnings.
- Storage: Keep a single latest checkpoint in `localStorage` (bounded size).

## Requirements (EARS)

1. WHEN the player opens Settings, THE SYSTEM SHALL present sections for Quality, Export/Import, and Reset. [Acceptance: Quality toggles; export provides copy/download; import accepts paste/upload; reset options visible]
2. WHEN a `WaveStarted` event occurs, THE SYSTEM SHALL autosave a Tier‑B checkpoint to localStorage. [Acceptance: localStorage key contains a valid save; wave 1 captured]
3. WHEN the player selects Reset Checkpoint, THE SYSTEM SHALL reload the last checkpoint and prepare the selected wave. [Acceptance: economy and towers reflect save; enemies/projectiles cleared; phase set for next `WaveStarted`]
4. WHEN the player selects Factory Reset, THE SYSTEM SHALL wipe progression/meta and reset the engine, preserving Quality. [Acceptance: game returns to idle; upgrades/researchPoints cleared; Quality unchanged]
5. WHEN importing JSON, THE SYSTEM SHALL validate/migrate the payload and show warnings without blocking load; invalid data will not change the current run. [Acceptance: invalid input leaves state unchanged; warnings visible]

## UX Layout

- Top‑right: `[Wrench] Settings` opens a modal.
- Modal sections:
  - Quality: High/Low toggle (calls existing `setQuality`).
  - Export/Import:
    - Export: Readonly textarea with JSON; Copy to Clipboard; Download `.json`.
    - Import: Paste textarea or file upload; Import button; warnings/errors panel.
  - Reset:
    - Reset Checkpoint: Reload last autosaved checkpoint (disabled if none exists).
    - Factory Reset: Confirm dialog; wipe progress/meta; keep Quality.

## Tier‑B Checkpoint Schema (JSON)

```json
{
  "schemaVersion": 1,
  "timestamp": "2025-12-21T00:00:00.000Z",
  "settings": { "quality": "high" },
  "ui": {
    "currentMapIndex": 0,
    "money": 100,
    "lives": 20,
    "totalEarned": 0,
    "totalSpent": 0,
    "researchPoints": 0,
    "upgrades": { "damage": 0, "range": 0 }
  },
  "checkpoint": {
    "waveToStart": 1,
    "towers": [
      { "type": "laser", "level": 1, "x": 5, "z": 7 },
      { "type": "missile", "level": 1, "x": 3, "z": 10 }
    ]
  }
}
```

Notes:

- Exclude enemies/projectiles/effects/deferred events; re-derive those at runtime.
- Validate towers against map bounds and buildable tiles; drop invalid ones with warnings.

## Autosave Flow

1. Engine emits `WaveStarted` in `runtime.applyTickResult`.
2. Reducer records a marker (e.g., `lastWaveStartedWave` or `waveStartedNonce`).
3. A `useEffect` in `GameState` detects marker change and calls `serializeCheckpoint()` and `saveToLocalStorage()`.
4. Guard autosave with `isRestoring`/`isImporting` flags to avoid autosaving immediately after import/reset.

## Reset Semantics

- Reset Checkpoint: Load last checkpoint → patch `ui` + rebuild towers in engine → clear enemies/projectiles/effects/events → set phase to preparing for `waveToStart`.
- Factory Reset: Use existing `resetGame()` semantics to wipe progression/meta and engine state; Quality remains unchanged.

## Import & Migration

- `migrateSave(input) -> { ok, save, warnings }`:
  - Normalize `currentMapIndex` via modulo against available maps.
  - Drop unknown `tower.type` and invalid positions (with warnings).
  - Drop unknown upgrade keys; coerce values to integers ≥ 0.
  - Coerce `waveToStart` to integer ≥ 1.
  - Reject unexpected types; collect warnings.
- `validateSave(save)` returns errors that block import; show warnings otherwise.
- UX shows warnings after import; import can proceed if valid.

## Risks & Mitigations

- Exploit loops (money/tower duplication): checkpoint includes economy and towers; reset reloads checkpoint wholesale.
- Autosave on import/reset: guard with `isRestoring`/`isImporting` flags.
- Dev StrictMode double effects: track `lastAutosavedWave` to prevent duplicate saves.
- Schema drift: version field + migration warnings; best‑effort mapping.

## Implementation Notes

- Storage key: `nd3d.checkpoint.v1` (single latest checkpoint).
- Helpers module: `src/game/persistence.ts` — serialize/migrate/validate/save/load.
- UI modal component: `src/components/ui/SettingsModal.tsx` patterned after `TechTreeModal` overlay.
- Hook point: marker set at `runtime.applyTickResult`; effect in `GameState` to perform the autosave.

## Validation & Testing

- Unit tests for migration warnings, invalid payload rejection, autosave trigger, reset behaviors.
- Web-first assertions for modal UI (Playwright) if e2e coverage is desired.

## Next Steps

- Implement per TASK008; update memory indexes accordingly.
