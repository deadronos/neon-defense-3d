# TASK026 — Dependency refresh to latest compatible versions

**Status:** Completed  
**Added:** 2026-10-07  
**Updated:** 2026-10-07

## Original Request

Open a branch, update the project to the latest packages/dependencies, fix any resulting
errors, and open a PR when done.

## Thought Process

- The `package.json` ranges were already fairly fresh, but `npm outdated` showed 40 packages
  behind, including several major bumps (`@testing-library/jest-dom` v7, `jsdom` v30,
  `vitest` v5 + `@vitest/coverage-v8` v5, `@types/node` v26).
- Two upgrades are blocked by the surrounding tooling ecosystem and must stay pinned:
  - **eslint@9.39.5** — `eslint-plugin-import` (≤9), `eslint-plugin-react` (≤9.7) and
    `eslint-plugin-jsx-a11y` (≤9) do not accept ESLint 10, while `eslint-plugin-unicorn` ≥66
    _requires_ ESLint ≥10.4. We therefore keep ESLint 9 and `eslint-plugin-unicorn` 65.0.1.
  - **typescript@6.0.3** — `@typescript-eslint` 8.71.1 (latest) only supports TS `<6.1.0`,
    so TypeScript 7 is not yet usable with the lint stack.
- All remaining runtime/tooling packages were upgraded to their latest versions.

## Implementation Plan

- Create `chore/dependency-update` branch.
- Record a green baseline (`typecheck` / `lint` / `test` / `build`).
- Bump `package.json` to latest compatible versions and run `npm install`.
- Fix errors caused by the upgrades (test types, config deprecations, formatting).
- Re-run the full check suite plus `npm run e2e` and `npm run test:coverage`.
- Update the memory bank and open a PR.

## Outcome

Upgraded packages (highlights):

- Runtime: `react`/`react-dom` 19.3.0, `three` 0.186.1 (`@types/three` 0.186.0),
  `@react-three/fiber` 9.8.1, `@react-three/drei` 10.7.9,
  `@react-three/postprocessing` 3.1.3, `zustand` 5.0.15, Radix UI, `lucide-react` 1.52.0.
- Tooling: `vite` 8.3.3, `vitest` 5.0.3, `@vitest/coverage-v8` 5.0.3, `jsdom` 30.1.2,
  `@testing-library/jest-dom` 7.0.1, `@playwright/test` 1.63.0, `prettier` 3.9.9,
  `@types/node` 26.6.4, `@typescript-eslint/*` 8.71.1.
- Pinned (ecosystem-blocked): `eslint` 9.39.5, `eslint-plugin-unicorn` 65.0.1,
  `typescript` 6.0.3.

Errors fixed:

1. **`@testing-library/jest-dom` v7 split its Vitest types** — switched the setup import to
   `@testing-library/jest-dom/vitest` (the default entry point now only augments Jest),
   resolving 79 TS errors in component tests.
2. **Prettier 3.9 formatting drift** — 4 formatting errors auto-fixed via `npm run format`.
3. **Vite 8 `configLoader: 'native'` warning** — replaced `__dirname` with
   `import.meta.dirname` in `vite.config.ts` / `vitest.config.ts`.
4. **Stale E2E assertion** — `verify_build_menu.spec.ts` expected a `, cost 50` suffix in the
   build-button `aria-label` that the UI never produced; aligned the matcher with the real
   accessible name (`Select Pulse Cannon`). E2E now passes.
5. **Lint warnings** — cleared all remaining warnings: removed unused type imports, replaced
   test `any` casts with `unknown`, tightened the `SfxBufferFactory` index type, simplified a
   redundant `isRunning` guard, and extracted `applyEnemyImpacts` from `stepProjectiles`
   (drops it below the 150-line limit). `npm run lint` now reports **0 problems**.

Verification:

- `npm run format:check` ✅
- `npm run lint` ✅ (0 problems)
- `npm run typecheck` ✅
- `npm run test` ✅ (44 files / 208 tests)
- `npm run test:coverage` ✅
- `npm run build` ✅
- `npm run e2e` ✅ (1 passed, 1 skipped baseline)
- `npm audit` ✅ (0 vulnerabilities after `npm audit fix`)

Notes / follow-ups:

- `@react-three/fiber` internally instantiates `THREE.Clock`, which three 0.186 deprecates in
  favour of `THREE.Timer`; the warning is library-side (fiber is already latest) and safe.
- Revisit ESLint 10 and TypeScript 7 once `eslint-plugin-import`/`eslint-plugin-react`/
  `eslint-plugin-jsx-a11y` support them and `@typescript-eslint` supports TS ≥7.
