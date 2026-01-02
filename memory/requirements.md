# Requirements — Current Game State + Settings/Save/Load/Reset Plan

**Status:** Draft (living document)  
**Updated:** 2025-12-21

## Purpose

This document serves two goals:

1. Capture the **current game state model and behavior** as implemented in the codebase.
2. Specify the **new Settings + Export/Import + Autosave Checkpoint + Reset** feature set in testable requirements.

This is a requirements document (what the system must do), not a design (how it does it). Implementation details appear only where needed to define observable behavior or data contracts.

## Current Implementation Snapshot (as of 2025-12-21)

### High-level architecture

- The game uses a **pure-ish engine state** (`EngineState`) and a **UI/meta state** (`UiState`).
- The React `GameProvider` owns a combined runtime reducer:
  - `runtime.engine: EngineState`
  - `runtime.ui: UiState`
- The render entities (`EnemyEntity`, `TowerEntity`, etc.) are **derived** from engine state and should not be treated as canonical.

### Canonical UI state (`UiState`)

Source: `src/game/engine/uiReducer.ts`

The UI state contains economy, progression, selection state, and graphics preset.

Fields:

- `money: number`
- `lives: number`
- `wave: number`
- `gameStatus: 'idle' | 'playing' | 'gameover' | 'victory'`
- `selectedEntityId: string | null`
- `selectedTower: TowerType | null`
- `currentMapIndex: number`
- `researchPoints: number`
- `totalDamageDealt: number`
- `totalCurrencyEarned: number`
- `graphicsQuality: 'high' | 'low'`
- `upgrades: Partial<Record<UpgradeType, number>>`

Initial defaults:

- `money = 150`, `lives = 20`, `wave = 1`, `gameStatus = 'idle'`, `currentMapIndex = 0`
- `graphicsQuality = 'high'`
- Totals and meta (`researchPoints`, `totalDamageDealt`, `totalCurrencyEarned`, `upgrades`) initialize to zero/empty.

Key behaviors (current):

- Starting a game (`startGame`) sets `gameStatus = 'playing'` and resets run/meta fields.
- Resetting (`resetGame`) sets `gameStatus = 'idle'` and resets run/meta fields.
- Starting next sector (`startNextSector`) increments `currentMapIndex`, sets `gameStatus = 'playing'`, resets per-run totals, and adjusts start money based on `GLOBAL_GREED` upgrade.
- `graphicsQuality` is a “sticky setting” (it is not reset by `startGame`/`resetGame` in current reducer).

Engine event effects on UI (current):

- `WaveStarted(wave)` updates `UiState.wave`.
- `EnemyKilled(reward)` increases `money` and `totalCurrencyEarned`.
- `MoneyAwarded(amount)` increases `money`.
- `LivesLost(amount)` decreases lives; sets `gameStatus = 'gameover'` when lives reach 0.
- `DamageDealt(amount)` increases `totalDamageDealt`.
- `WaveCompleted(wave)` triggers `victory` every 10 waves if currently playing, awarding research points:
  - `earnedRP = floor(totalDamageDealt / 200 + totalCurrencyEarned / 100)`

### Canonical engine state (`EngineState`)

Source: `src/game/engine/types.ts`

The engine state contains the simulation entities and wave progression.

Fields:

- `enemies: EngineEnemy[]`
- `towers: EngineTower[]`
- `projectiles: EngineProjectile[]`
- `effects: EngineEffectIntent[]`
- `wave: EngineWaveState | null`
- `idCounters: { enemy: number; tower: number; projectile: number; effect: number }`
- `pendingEvents: EngineEvent[]`

Wave state:

- `wave: number`
- `phase: 'preparing' | 'spawning' | 'active' | 'completed'`
- `enemiesRemainingToSpawn: number`
- `enemiesAlive: number`
- `timerMs: number`
- `spawnIntervalMs: number`

Engine entity notes:

- Engine vectors are plain arrays/tuples (`EngineVector2`, `EngineVector3`).
- Towers are stored in grid coordinates (`gridPosition: [x, z]`).
- Projectiles track `origin`, `targetId`, `progress`, and damage properties (optionally freeze/splash).

### Runtime reducer behaviors (engine + UI)

Source: `src/game/GameState.tsx`

Key actions:

- Placing a tower:
  - Allowed only when `ui.gameStatus === 'playing'`.
  - Requires `ui.money >= tower cost`.
  - Deducts money and appends a new `EngineTower` to `engine.towers`.
- Upgrading a tower:
  - Requires money >= computed upgrade cost.
  - Increments `EngineTower.level`.
- Selling a tower:
  - Removes it from `engine.towers`.
  - Refunds `floor(baseCost * 0.7)` and clears selection.

Reset semantics (current):

- `startGame()`: dispatches UI `startGame`, then resets engine.
- `resetGame()`: dispatches UI `resetGame`, then resets engine.
- `startNextSector()`: dispatches UI `startNextSector`, then resets engine.

Important: `resetEngine` (current) recreates a fresh `EngineState`, which **removes towers, enemies, projectiles, effects**, and clears pending events.

### Current UI controls relevant to new work

Source: `src/components/ui/TopBar.tsx`

- TopBar renders HUD blocks (lives/resources/wave).
- Top-right currently contains a single button: **“Quality: High/Low”** (toggles graphics preset).

## New Feature Requirements: Settings + Export/Import + Autosave Checkpoint + Reset

### Terminology

- **Settings modal**: a toggleable overlay opened from a wrench button in the top-right.
- **Tier‑B checkpoint**: a compact save containing **towers + wave-to-start + economy + meta**, excluding ephemeral simulation entities.
- **Latest checkpoint**: the most recent autosaved checkpoint, overwritten each wave.
- **Best-effort migration**: importing older/unknown schema attempts to normalize and drop invalid parts, providing warnings.

### Persisted data (Tier‑B checkpoint)

The Tier‑B checkpoint SHALL contain enough information to restore a run fairly and deterministically at a checkpoint boundary.

Required persisted fields:

- `schemaVersion` (number)
- `timestamp` (ISO string)
- `ui.currentMapIndex` (number)
- `ui.money` (number)
- `ui.lives` (number)
- `ui.totalDamageDealt` (number)
- `ui.totalCurrencyEarned` (number)
- `ui.researchPoints` (number)
- `ui.upgrades` (record of upgrade levels)
- `checkpoint.waveToStart` (number)
- `checkpoint.towers[]` (tower type, level, and grid position)

Explicitly NOT persisted (Tier‑B):

- Enemies, projectiles, effects
- Engine pending events
- UI selections (`selectedEntityId`, `selectedTower`)

Graphics quality persistence:

- `graphicsQuality` MAY be included as a convenience setting, but Factory Reset SHALL keep the current Quality regardless.

### Functional requirements (EARS)

#### Settings UI

1. WHEN the player is in-game, THE SYSTEM SHALL provide a wrench Settings button in the top-right UI.  
   **Acceptance:** the Quality button is removed from TopBar and replaced with a Settings entrypoint.

2. WHEN the player opens Settings, THE SYSTEM SHALL display sections for:
   - Quality
   - Export/Import
   - Reset

   **Acceptance:** all sections are visible and usable with pointer events enabled.

3. WHEN the player toggles Quality in Settings, THE SYSTEM SHALL update the `graphicsQuality` preset immediately.  
   **Acceptance:** UI reflects the new preset and rendering changes accordingly.

#### Autosave checkpoint

1. WHEN the engine emits a `WaveStarted` event, THE SYSTEM SHALL autosave a Tier‑B checkpoint as the latest checkpoint.  
   **Acceptance:** wave 1 is saved; subsequent waves overwrite the same storage key.

2. WHEN autosave is suppressed due to import/reset/restore, THE SYSTEM SHALL NOT write a checkpoint for that transition.  
   **Acceptance:** importing a save does not immediately overwrite it with a new autosave.

#### Export

1. WHEN the player selects Export in Settings, THE SYSTEM SHALL present the latest checkpoint as JSON text.  
   **Acceptance:** the JSON is visible in a read-only field.

2. WHEN the player selects Copy, THE SYSTEM SHALL copy the JSON to the clipboard.  
   **Acceptance:** clipboard contains valid JSON.

3. WHEN the player selects Download, THE SYSTEM SHALL download the JSON as a `.json` file.  
   **Acceptance:** file downloads and can be imported back.

#### Import with migrations

1. WHEN the player provides JSON for import, THE SYSTEM SHALL parse, migrate (best-effort), and validate it.  
   **Acceptance:** invalid JSON does not change game state; errors are shown.

2. WHEN migration drops or normalizes fields, THE SYSTEM SHALL surface non-blocking warnings to the player.  
   **Acceptance:** the import completes (if valid) and warnings are listed in Settings.

3. WHEN the player confirms an import, THE SYSTEM SHALL replace the current checkpoint-relevant state with the imported checkpoint.  
   **Acceptance:** towers/economy/meta/map index reflect the save; enemies/projectiles/effects are cleared.

#### Reset behaviors

1. WHEN the player chooses Reset Checkpoint, THE SYSTEM SHALL reload the latest autosaved checkpoint.  
   **Acceptance:** run state matches the latest checkpoint; no partial rewinds.

2. WHEN the player chooses Factory Reset and confirms, THE SYSTEM SHALL wipe progression and return to a fresh idle state while keeping Quality.  
   **Acceptance:** research points/upgrades reset; map index resets; `graphicsQuality` remains unchanged.

### Data validation requirements (Tier‑B)

1. WHEN importing towers, THE SYSTEM SHALL drop towers with unknown types and report a warning.  
   **Acceptance:** import succeeds (if otherwise valid) and towers list omits unknown types.

2. WHEN importing tower placements, THE SYSTEM SHALL drop towers on non-buildable tiles or out-of-bounds coordinates and report a warning.  
   **Acceptance:** no imported tower appears on invalid tiles.

3. WHEN importing upgrades, THE SYSTEM SHALL drop unknown upgrade keys and coerce upgrade levels to integers ≥ 0.  
   **Acceptance:** upgrade map contains only known keys and non-negative integer values.

4. WHEN importing `currentMapIndex`, THE SYSTEM SHALL normalize out-of-range indexes to a valid map index and report a warning.  
   **Acceptance:** game loads with a valid map and warns if normalization occurred.

## Traceability

- Detailed plan: `plans/settings-save-import-reset.md`
- Design/spec: `memory/designs/DESIGN006-settings-modal-save-import-reset.md`
- Implementation plan: `memory/tasks/TASK008-implement-settings-save-import-reset.md`

---

# Requirements — Performance Hot Paths (Targeted Optimizations)

**Status:** Draft (living document)  
**Updated:** 2026-01-02

## Functional requirements (EARS)

1. WHEN the engine tick runs with a cache instance, THE SYSTEM SHALL reuse cached collections for spatial grid, projectile tracking, and enemy positions to reduce per-tick allocations.  
   **Acceptance:** engine tick output is unchanged and cached structures are mutated/cleared instead of replaced.

2. WHEN towers evaluate targets, THE SYSTEM SHALL compare squared distances against squared ranges to avoid per-target square roots.  
   **Acceptance:** targeting results match prior behavior for identical inputs.

3. WHEN enemies advance along the path, THE SYSTEM SHALL reuse precomputed path segment lengths when available.  
   **Acceptance:** movement results match prior behavior for identical inputs.

4. WHEN projectiles are derived for rendering, THE SYSTEM SHALL use an enemy ID lookup table instead of scanning the enemy array per projectile.  
   **Acceptance:** rendered projectile positions match prior behavior for identical inputs.

---

# Requirements — Dynamic Resolution Scaling

**Status:** Draft (living document)  
**Updated:** 2026-01-02

## Functional requirements (EARS)

1. WHEN the frame rate drops below the target range, THE SYSTEM SHALL reduce DPR in small steps within configured bounds.  
   **Acceptance:** DPR decreases when FPS stays below the target for at least one check interval.

2. WHEN the frame rate rises above the target range, THE SYSTEM SHALL increase DPR in small steps within configured bounds.  
   **Acceptance:** DPR increases when FPS stays above the target for at least one check interval.

3. WHEN DPR changes, THE SYSTEM SHALL clamp the value between `MIN_DPR` and `MAX_DPR`.  
   **Acceptance:** DPR never falls below `MIN_DPR` or exceeds `MAX_DPR`.

4. WHEN the game starts, THE SYSTEM SHALL initialize DPR to `MAX_DPR` and adjust dynamically thereafter.  
   **Acceptance:** initial DPR matches `MAX_DPR` and subsequent changes occur via the scaler.
