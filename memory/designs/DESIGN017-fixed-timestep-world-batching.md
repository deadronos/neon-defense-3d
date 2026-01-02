# DESIGN017 — Fixed Timestep + Interpolated Rendering + World Batching

**Status:** Draft
**Updated:** 2026-01-02

## Summary

Introduce a fixed-timestep simulation loop with render interpolation, batch the world grid into instanced geometry, and reduce instanced material cost to improve scalability at high entity counts.

## Goals

- Keep simulation deterministic and stable under variable frame times.
- Smooth visuals via interpolation between simulation ticks.
- Reduce per-frame React rerenders for static world tiles.
- Reduce draw calls/material cost for large instanced sets.

## Architecture

- **Fixed Step Loop:** `GameLoopBridge` accumulates frame delta and advances the engine in fixed steps (e.g., 1/60s).
- **Render Interpolation:** `RenderState` caches previous positions per entity; render loop lerps between previous and current using `renderAlpha`.
- **World Batching:** `World` renders a single instanced plane mesh for tiles and a single line-segment grid overlay.
- **Material Downgrade:** Replace instanced `meshStandardMaterial` with `meshLambertMaterial`/`meshBasicMaterial`.

## Data Flow

1. Render loop accumulates `delta` → steps engine in fixed increments.
2. Each fixed step syncs engine state into `renderStateRef` and updates previous position caches.
3. Render loop calculates `renderAlpha` from remaining accumulator time.
4. Instanced renderers lerp positions using cached previous/current positions.
5. World tiles are static; hover feedback updates instance colors without per-tile React rerenders.

## Interfaces

- `RenderState` adds:
  - `previousEnemyPositions: Map<string, Position3>`
  - `previousProjectilePositions: Map<string, Position3>`
  - `projectilePositions: Map<string, Position3>`
  - `renderAlpha: number`
- New hooks:
  - `useGameUi()` for UI state/actions.
  - `useRenderState()` for render-only state.
  - `useWorld()` for static world interactions.

## Risks & Mitigations

- **Interpolation artifacts:** New entities may “pop.”
  - Mitigation: seed previous position with current position on spawn.
- **Input latency with fixed step:** Large frame spikes could reduce responsiveness.
  - Mitigation: clamp max frame time and keep accumulator bounded.
- **World hover state staleness:** Interaction state might not update per frame.
  - Mitigation: update hovered instance color on pointer move and on state changes.

## Verification Plan

- Visual smoke test: enemies/projectiles move smoothly when FPS fluctuates.
- Confirm world grid renders via one instanced mesh + one line overlay.
- Verify hover/build interactions work on tiles with correct placement validation.
- Confirm instanced materials use Lambert/Basic and still render correctly.
