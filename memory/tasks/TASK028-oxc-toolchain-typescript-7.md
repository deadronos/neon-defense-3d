# TASK028 — Migrate ESLint/Prettier to oxlint/oxfmt and upgrade to TypeScript 7

**Status:** Completed  
**Added:** 2026-10-17  
**Updated:** 2026-10-17

## Original Request

Follow the SpaceAutoBattler approach (Oxc tooling) to unblock TypeScript 7: replace ESLint +
Prettier with standalone oxlint + oxfmt (keeping plain Vite), upgrade TS, fix errors, open a PR.

## Thought Process

- TASK026 kept `typescript` on 6.0.3 because `@typescript-eslint` 8 caps TS at `<6.1`, and kept
  ESLint on 9 because `eslint-plugin-import`/`react`/`jsx-a11y` don't accept ESLint 10.
- oxlint has native ports of nearly every rule we used, and `oxlint-tsgolint` runs the type-aware
  rules (`no-floating-promises`, `strict-boolean-expressions`, …) on the Go-based TS 7 checker, so
  nothing in the lint stack depends on TypeScript's JS API anymore.
- Full vite-plus (as in SpaceAutoBattler) was rejected as too much churn for dev/build/test.

## Outcome

- Removed: `eslint`, `@typescript-eslint/*`, `eslint-config-prettier`,
  `eslint-import-resolver-typescript`, all `eslint-plugin-*`, `prettier`, `eslint.config.js`,
  `.prettierrc`, `.prettierignore`.
- Added: `oxlint` 1.88.0, `oxlint-tsgolint` 7.0.2004, `oxfmt` 0.73.0, `typescript` 7.0.2.
- `.oxlintrc.json` mirrors the old rule set; `.oxfmtrc.json` was migrated from `.prettierrc` and adds
  `sortImports` with the old `import/order` groups.
- `tsconfig.json`: dropped `baseUrl` + `ignoreDeprecations` (removed in TS 7), `paths` now
  `./src/*`, added `erasableSyntaxOnly` (replaces the `no-restricted-syntax` enum ban).
- Dropped `eslint-plugin-sonarjs`: loading it as an oxlint JS plugin fails because it imports
  `ts-api-utils`/the TypeScript JS API, which TS 7 doesn't ship. `complexity` (already enabled)
  covers cognitive complexity; `no-unneeded-ternary` and
  `typescript/no-unnecessary-boolean-literal-compare` cover the boolean-simplification rules.
  Rewrote `sonarjs/cognitive-complexity` disable comments to `complexity`.
- oxlint's default `correctness` category surfaced 43 new warnings. React Compiler rules (`refs`,
  `purity`, `immutability`, `set-state-in-effect`, `use-memo`) and `jsx-a11y/prefer-tag-over-role`
  were turned off (intentional R3F patterns / styled div dialogs). The rest were fixed: volume
  sliders now have associated `<label htmlFor>`s, useless spread fallbacks, `new Array().fill`,
  test cleanups (meaningless `void`, erasing ops, unbound method, typed `MockInstance`, hoisted
  `TestApp`).
- oxfmt normalized line endings to LF (73 files were committed with CRLF; `endOfLine: auto` is not
  supported).

## Verification

`format:check`, `lint` (0 diagnostics, 174 files, type-aware), `typecheck` (TS 7.0.2), `test`
(44 files / 208 tests), `build`, `e2e` (1 passed / 1 skipped), `npm audit` (0), `npm outdated` (empty).
