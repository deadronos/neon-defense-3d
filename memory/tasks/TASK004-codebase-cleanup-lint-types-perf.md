# TASK004 — Codebase cleanup (lint, types, perf)

**Status:** Done  
**Added:** 2025-12-12  
**Updated:** 2025-12-12  

## Original Request

Perform a repo cleanup pass:

- Run `lint:fix` + `format`.
- Remove unsafe casts in runtime adapter where possible.
- Reduce obvious per-frame/per-tick allocations in hot paths.
- Remove unused dependencies (e.g., `zustand` if unused).
- Update memory docs if they drift from code.

## Requirements (EARS)

1. WHEN running `npm run lint`, THE SYSTEM SHALL report no lint errors. [Acceptance: `npm run lint` exits 0]
2. WHEN running `npm run typecheck`, THE SYSTEM SHALL report no TypeScript errors. [Acceptance: `npm run typecheck` exits 0]
3. WHEN running `npm test`, THE SYSTEM SHALL pass all unit tests. [Acceptance: `npm test` exits 0]
4. WHEN stepping the simulation in runtime, THE SYSTEM SHALL not rely on `as unknown as` casts for core wiring. [Acceptance: no `as unknown as` in `src/game/GameState.tsx`]
5. WHEN stepping projectiles, THE SYSTEM SHALL avoid `O(P*E)` target lookup. [Acceptance: engine projectile step builds a map once per tick]

## Implementation Plan

- Update UI state to avoid duplicate `isPlaying` storage; derive `isPlaying` from `gameStatus` at the adapter boundary.
- Remove runtime casts by aligning types and/or deriving view state objects.
- Optimize engine projectile stepping by pre-indexing enemies by id once per tick.
- Reduce renderer allocations by reusing Maps between frames.
- Remove unused `zustand` dependency and update lockfile.
- Run `lint:fix`, `format`, `typecheck`, and `test`.
- Update `memory/progress.md` if notes are stale.

## Progress Log

### 2025-12-12

- Removed unsafe casts in `GameState` adapter wiring and derived `isPlaying` from `gameStatus`.
- Reduced hot-path allocations (projectile target lookup in engine; map/cache reuse in renderer).
- Removed unused direct `zustand` dependency.
- Ran `lint:fix`, `format`, `lint`, `typecheck`, and `test` (all passing).
