# TASK024 — Fix ESLint errors after new rules

**Status:** Done  
**Added:** 2026-01-05  
**Updated:** 2026-01-05

## Original Request

Fix `npm run lint` after introducing new lint rules (errors first; warnings if feasible).

## Requirements (EARS)

1. WHEN running `npm run lint`, THE SYSTEM SHALL report no lint errors. [Acceptance: `npm run lint` exits 0]

## Implementation Plan

- Fix ESLint errors (misused promises, floating promises, hook deps).
- Remove enum declarations flagged by lint rule (prefer union types).
- Run Prettier on touched files.
- Re-run `npm run lint` to verify.

## Progress Log

### 2026-01-05

- Fixed async handler / promise lint issues in Settings Export/Import and AudioManager tests.
- Memoized `gameState` in `GameProvider` to satisfy hook dependency linting.
- Replaced `enum` exports with `as const` value objects + union types in `src/types.ts`.
- `npm run lint` now exits 0 (warnings remain).
