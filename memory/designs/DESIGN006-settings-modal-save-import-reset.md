# DESIGN006 — Settings Modal + Tier‑B Save/Load/Reset with Wave Autosave

**Status:** Proposed  
**Date:** 2025-12-21  
**Deciders:** Project maintainers

## Context

We need an export/import/reset feature that fits the current architecture and avoids UI clutter. The solution should:

- Add a wrench Settings modal and move Quality inside it.
- Persist Tier‑B “checkpoint” state (towers + wave + economy + meta), not full simulation.
- Autosave a checkpoint at every `WaveStarted` event (including wave 1).
- Provide Reset Checkpoint (reload last checkpoint) and Factory Reset (wipe progress/meta, keep Quality).
- Use best‑effort migration with non-blocking warnings on import.

## Decision

- Introduce `SettingsModal` with three sections: Quality, Export/Import, Reset.
- Implement a small event marker for `WaveStarted` in `engine/runtime.applyTickResult` → consume in a `GameState` `useEffect` to autosave once per wave.
- Define a stable JSON schema for Tier‑B checkpoint; exclude ephemeral engine entities/events.
- Implement `migrateSave` (normalize/drop-invalid, warn) and `validateSave` (block on fatal errors).
- Store a single “latest checkpoint” in `localStorage` under a versioned key.

## Architecture

### Components & Modules

- `TopBar` — replaces Quality button with wrench Settings button.
- `SettingsModal` — overlay patterned after `TechTreeModal`; includes Quality toggle, export/import, reset.
- `persistence.ts` — helpers to serialize, migrate, validate, save/load checkpoint JSON.
- `GameState` — houses autosave `useEffect`, import/reset guards (`isImporting`, `isRestoring`).
- `engine/runtime` — sets `WaveStarted` marker in `applyTickResult` (pure; no side-effects).

### Data Flow

1. Wave autosave
   - Engine emits `WaveStarted` → runtime aggregates → reducer records marker → `GameState` effect serializes Tier‑B checkpoint → save to `localStorage`.
2. Export
   - Read latest checkpoint; present JSON in modal; Copy and Download actions.
3. Import
   - Paste/upload JSON → `migrateSave` + `validateSave` → show warnings → on confirm `applyCheckpoint` patches UI + rebuilds engine towers → clear enemy/projectile/effect/events → set phase to preparing → set guard to suppress autosave this tick.
4. Reset
   - Reset Checkpoint: `loadCheckpoint` + `applyCheckpoint`.
   - Factory Reset: call existing `resetGame()` (wipe progress/meta, keep Quality).

## Interfaces (TypeScript signatures)

```ts
// src/game/persistence.ts
export type Quality = 'high' | 'low';

export interface SaveV1 {
  schemaVersion: 1;
  timestamp: string; // ISO
  settings?: { quality?: Quality };
  ui: {
    currentMapIndex: number;
    money: number;
    lives: number;
    totalEarned: number;
    totalSpent: number;
    researchPoints: number;
    upgrades: Record<string, number>;
  };
  checkpoint: {
    waveToStart: number;
    towers: Array<{ type: string; level: number; x: number; z: number }>;
  };
}

export interface MigrateResult {
  ok: boolean;
  save?: SaveV1;
  warnings: string[];
  errors?: string[];
}

export function serializeCheckpoint(ui: UiState, engine: EngineState): SaveV1;
export function migrateSave(input: unknown): MigrateResult;
export function validateSave(save: SaveV1): { ok: boolean; errors: string[] };
export function saveCheckpoint(save: SaveV1): void; // localStorage overwrite
export function loadCheckpoint(): SaveV1 | null;
export function applyCheckpoint(save: SaveV1, ctx: GameContext): void;
```

## JSON Schema (informal)

- `schemaVersion`: number (1)
- `timestamp`: ISO string
- `settings.quality`: `'high' | 'low'` (optional)
- `ui.currentMapIndex`: integer ≥ 0 (normalized modulo maps count)
- `ui.money/lives/totalEarned/totalSpent/researchPoints`: integers ≥ 0
- `ui.upgrades`: Record<string, integer ≥ 0> (drop unknown keys)
- `checkpoint.waveToStart`: integer ≥ 1
- `checkpoint.towers[]`: `{ type in TowerType, level ≥ 1, x/z within bounds & buildable }`

## Error Handling Matrix

| Condition                           | Handling                               | UX                |
| ----------------------------------- | -------------------------------------- | ----------------- |
| Invalid JSON                        | Block import                           | Show error banner |
| Missing/unknown `schemaVersion`     | Treat as v0 → migrate                  | Warning           |
| Unknown `tower.type`                | Drop tower                             | Warning           |
| Invalid `x/z` or unbuildable tile   | Drop tower                             | Warning           |
| Unknown upgrade key                 | Drop key                               | Warning           |
| Negative/non-integer upgrade values | Coerce to ≥0 int                       | Warning           |
| `currentMapIndex` out-of-range      | Normalize via modulo                   | Warning           |
| `waveToStart` invalid               | Coerce/clamp ≥1                        | Warning           |
| Import while playing                | Pause or guard during apply            | Info              |
| Autosave immediately after import   | Suppress via `isImporting/isRestoring` | None              |
| localStorage quota                  | Fallback to memory-only; notify        | Error             |

## Testing Strategy

- Unit: migration warnings, validation errors, autosave trigger on `WaveStarted`, checkpoint reload behavior, factory reset behavior.
- Integration: modal interactions (export copy/download; import paste/upload; warnings list; reset confirmations).
- Optional e2e: Playwright web-first assertions for Settings modal structure and actions.

## Performance & Security

- Performance: autosave once per wave; tiny JSON payload; overwrite only.
- Security: no secrets/PII in saves; sanitize inputs; avoid executing code from imported JSON.

## Risks & Mitigations

- Farming exploits: restore economy+towers wholesale; avoid partial “rewind”.
- Schema drift: versioning + `migrateSave` warnings + resilience.
- Dev StrictMode: track latest autosaved wave to dedupe.

## Acceptance Checklist

- [ ] 2–5 testable requirements written (see plan).
- [ ] Design doc linked in PR (this file).
- [ ] Tests for each requirement (unit/integration).
- [ ] Performance baseline not needed; autosave is lightweight.
- [ ] Decision records: checkpoint scope, Quality persistence.
- [ ] Exec summary with action log in PR.
