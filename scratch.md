# Issue Execution Plan (`scratch.md`)

> Phased roadmap for resolving issues `#120`–`#139` (grouped under umbrellas `#140`–`#145`) from the full codebase review.

## Umbrella Index

| Umbrella                                                        | Domain                                       | Child Issues                   | Related Open Issues |
| --------------------------------------------------------------- | -------------------------------------------- | ------------------------------ | ------------------- |
| [#140](https://github.com/deadronos/neon-defense-3d/issues/140) | Gameplay, Combat & Balance                   | `#120`, `#121`, `#122`, `#123` | `#107`              |
| [#141](https://github.com/deadronos/neon-defense-3d/issues/141) | UI, UX & Accessibility                       | `#124`, `#125`, `#126`, `#127` | —                   |
| [#142](https://github.com/deadronos/neon-defense-3d/issues/142) | Visuals, 3D Rendering & FX                   | `#128`, `#129`, `#130`, `#131` | `#106`              |
| [#143](https://github.com/deadronos/neon-defense-3d/issues/143) | Performance & Runtime Architecture           | `#132`, `#133`, `#134`         | `#105`, `#109`      |
| [#144](https://github.com/deadronos/neon-defense-3d/issues/144) | Audio Engine & Sound Design                  | `#135`, `#136`                 | `#109`              |
| [#145](https://github.com/deadronos/neon-defense-3d/issues/145) | Persistence, Code Hygiene, Tooling & Testing | `#137`, `#138`, `#139`         | —                   |

---

## Execution Batches

### Batch 1 — P0 Gameplay & HUD Bug Fixes (Immediate Quick Wins)

High-severity, user-visible bugs with tight scope and immediate impact. Land regression tests for each fix in the same PR.

- [x] **#120** — Fix `2x`/`4x` game speed desync breaking tower fire rates (`GameLoop.tsx`, `useGameStep.ts`, `tower.ts`)
- [x] **#124** — Fix HUD & Upgrade Inspector display bugs: 1.5× upgrade cost mismatch, `20%` health readout, fractional `$157.5` currency, off-by-one Game Over wave count, hardcoded `"UP"` fire-rate delta (`InspectorActions.tsx`, `InspectorStats.tsx`, `TopBar.tsx`, `GameOverScreen.tsx`, `uiReducer.ts`)
- [x] **#128** — Fix invisible `SynergyLinks`, missing synergy range ring, and per-frame buffer allocations (`renderStateUtils.ts`, `SynergyLinks.tsx`, `InstancedTowers.tsx`)
- [x] **#133** — Fix `DynamicResScaler` inability to recover DPR on 60 Hz displays (`dprTuning.ts`, `DynamicResScaler.tsx`)

**Suggested PR split:**

1. PR 1A: `#120` + `#133` (simulation clock & DPR tuning)
2. PR 1B: `#124` + `#128` (HUD readouts & synergy render propagation)

---

### Batch 2 — Runtime Architecture, 60 Hz Render Churn & GPU/GC Hot Paths

Fix the store/context plumbing and hot-path rendering pipeline before layering on new UI controls or 3D visual features.

- [x] **#132** — Eliminate 60 Hz React re-renders and 3× redundant Zustand reducer execution (`useGameStores.ts`, `battleStore.ts`, `uiStore.ts`, `GameState.tsx`, `useDerivedEntities.ts`, `useGameStep.ts`, `App.tsx`) _(related: `#105`)_
- [x] **#129** — Fix particle frustum pop-out (`Effects.tsx`, `Trails.tsx`), Roguelite tile buffer overflow (`World.tsx`), and trail `depthWrite` / pause artifacts
- [x] **#134** — Optimize GPU instance uploads (`mesh.count` / dirty flags in `Trails`/`Effects`), hoist `activeMeshes` & memoize `setMeshRef` in `useInstancedUpdater.ts`, fix `targetPositionPool` leak in `tower.ts` & tuple churn in `projectile.ts`
- [x] **#130** — Remove unused Three.js shadow and lighting pipeline (`GameCanvas.tsx`, `Scene.tsx`) — or intentionally wire lit materials + shadows

**Dependency note:** Do `#132` before Batch 5 (UI/Pause/Shortcuts) so new UI features subscribe cleanly without re-introducing 60 Hz re-renders.

---

### Batch 3 — Roguelite Mode & Persistence Reliability

Tightly coupled around `uiReducer`, `RogueliteManager`, `WFCClient`, and `src/game/persistence/`. Can run in parallel with Batch 4.

- [ ] **#121** — Fix Roguelite Wave 10 transition deadlock, `roguePhase` difficulty scaling, procedural map path validation, and `WFCClient` worker lifecycle/error handling (`RogueliteManager.tsx`, `wave.ts`, `uiReducer.ts`, `wfc.worker.ts`, `WFCClient.ts`)
- [ ] **#137** — Fix save/load & autosave edge cases: Roguelite `-1 % 3` restore crash, save schema/validation support for Roguelite metadata, and fresh-run Wave 1 autosave overwrite (`useGameActions.ts`, `persistence/validation.ts`, `persistence/serialize.ts`, `persistence/runtime.ts`, `useAutosaveCheckpoint.ts`)

---

### Batch 4 — Audio Engine & Sound Design

Self-contained under `src/game/audio/` plus minimal event hooks. Can run in parallel with Batch 3.

- [x] **#135** — Fix `SynthArpScheduler` Web Audio clock scheduling (`setValueAtTime`) and missing note decay envelope (`noteDurationSec`) (`synthArp.ts`)
- [x] **#136** — Wire dead/misfired SFX (`impact`, kills, UI `click`, affordability check before `'build'`), add voice limiting + pitch jitter + `DynamicsCompressorNode`, lazy-init `AudioContext`/reverb impulse, and persist audio preferences (`Synth.ts`, `AudioManager.tsx`, `useGameStep.ts`, `useGameActions.ts`) _(related: `#109`)_

---

### Batch 5 — Controls, UI Cohesion & Accessibility

Builds cleanly on Batch 1's corrected HUD readouts and Batch 2's decoupled UI subscriptions.

- [ ] **#125** — Add Pause (`0x`), auto-pause when Settings is open, and global keyboard shortcuts (`Esc`, `1`–`5`, `Space`, `U`, `Backspace`) (`TopBar.tsx`, `UI.tsx`, `SettingsModal.tsx`, `InspectorActions.tsx`)
- [ ] **#126** — Fix `index.css` light-mode `:root` token clash, unify HUD/modal visual language, consolidate `BuildMenu` `TooltipProvider`, load/align announcer typography, surface Cryo/Missile/Synergy tooltip details & Sector/Phase/Seed in `TopBar`
- [ ] **#127** — Modal focus trapping & dismissal, `prefers-reduced-motion` support, and colorblind-friendly tower/hover cues

---

### Batch 6 — Tactical Depth, Game Balance & 3D Combat Readability

Core gameplay & visual upgrades layered on top of the stabilized engine and renderer.

- [ ] **#122** — Add per-tower targeting priority modes (`First`, `Strongest`, `Closest`, `Last`) with inspector UI & persistence (`tower.ts`, `InspectorActions.tsx`, `persistence/`)
- [ ] **#123** — Rebalance tower upgrade ROI vs spam, Cryo/Missile scaling & synergies, Triangulation crit/description alignment, `GLOBAL_GREED` consistency, Tech Tree RP curve/caps, and boss wave composition (`constants.ts`, `utils.ts`, `synergies.ts`, `uiReducer.ts`, `wave.ts`, `TechTreeModal.tsx`) _(related: `#107`)_
- [ ] **#131** — Add instanced 3D enemy HP bars, turret target tracking, placement range/synergy hover preview, and distinct tower/enemy silhouettes (`Enemies.tsx`, `InstancedTowers.tsx`, `useTileHover.ts`) _(related: `#106`)_

---

### Batch 7 — Code Hygiene, Tooling & Test Suite Speed

Cleanup and cross-cutting test infrastructure. Small hygiene deletions from `#138` can be cherry-picked earlier if convenient.

- [ ] **#138** — Delete `src/game/wfc/rogue_flag.txt`, clean unused `wfc/rules.ts` / `UpgradeType.TOWER_DAMAGE` / `Synth.safeClearInterval` / `renderStateUtils.ts` scratch comments, remove stale `index.html` CDN `importmap`, type `useInstancedUpdater` with `RenderState`, and configure Vite bundle chunk splitting
- [ ] **#139** — Complete cross-seam integration regression tests and speed up Vitest `jsdom` setup (`pool: 'vmThreads'` or `node` env for pure engine/audio/perf tests)

---

## Standard Verification Gate (Every Batch PR)

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
```
