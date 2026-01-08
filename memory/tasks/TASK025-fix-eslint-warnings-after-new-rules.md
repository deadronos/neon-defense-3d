# TASK025 — Fix ESLint warnings after new rules

**Status:** Completed  
**Added:** 2026-01-05  
**Updated:** 2026-01-05

## Original Request

Fix most or all `npm run lint` warnings after introducing new lint rules.

## Requirements (EARS)

1. WHEN running `npm run lint`, THE SYSTEM SHALL report zero warnings if feasible. [Acceptance: `npm run lint` shows 0 problems]
2. WHEN warning-free is not feasible without disproportionate refactors, THE SYSTEM SHALL minimize warnings while keeping rule intent. [Acceptance: rationale + remaining warnings documented]

## Implementation Plan

- Generate a full warning report (eslint JSON) to rank warning types by frequency.
- Fix high-signal warnings in production code (`src/`) first (strict-boolean, nullish coalescing, react-refresh, context values).
- Address tests (`src/tests`, `tests`) by refactoring or scoped overrides if refactors are too noisy.
- Re-run `npm run lint` to validate.

## Outcome

- `npm run lint` reports **0 problems** (warnings/errors).
- Key refactors: extracted `src/game/gameContexts.ts` (to satisfy `react-refresh/only-export-components`), split `useAudio` into `src/game/audio/useAudio.ts`, updated imports/mocks accordingly, and ran Prettier on touched files to normalize line endings.
