# Technical Context

## Stack

- React 19, TypeScript
- @react-three/fiber (R3F) + @react-three/drei helpers
- @react-three/postprocessing for post effects
- Three.js (`three`) for 3D primitives
- Vite for dev server and build
- Tailwind CSS for HUD/overlay styling

## Notable dependencies (from `package.json`)

- `react`, `react-dom` (v19.3)
- `three` 0.186 (+ `@types/three`), `@react-three/fiber` 9.8, `@react-three/drei` 10.7, `@react-three/postprocessing` 3.1
- `vite` 8.3 (build/dev), `typescript` 7.0, `vitest` 5 + `@vitest/coverage-v8` 5 (tests), `jsdom` 30
- `@testing-library/*` (jest-dom v7 — import matchers from `@testing-library/jest-dom/vitest` in the setup file)
- `playwright` 1.64 for e2e tests and screenshots

### Lint / format toolchain (Oxc)

- **oxlint** (`.oxlintrc.json`) + **oxlint-tsgolint** for type-aware rules (`oxlint --type-aware`).
  Replaced ESLint + `@typescript-eslint`, whose TS `<6.1` cap blocked TypeScript 7.
- **oxfmt** (`.oxfmtrc.json`) replaced Prettier; it also sorts imports (replaces `import/order`).
- Enums are banned via `erasableSyntaxOnly` in `tsconfig.json` (replaces `no-restricted-syntax`).
- Not carried over: `eslint-plugin-sonarjs` (needs TypeScript's JS API, which TS 7 doesn't ship),
  `import/no-unresolved` / `no-extraneous-dependencies` (tsc covers unresolved imports),
  `react/jsx-no-leaked-render`, `unicorn/better-regex`.
- TS 7 removed `baseUrl`; the `@/*` alias is `"paths": { "@/*": ["./src/*"] }`.

## Developer commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run test` — run unit tests (Vitest)
- `npm run e2e` — run Playwright end-to-end tests

## Testing & CI

- Unit tests live in `tests/` and use Vitest. Keep tests fast and deterministic and preferentially isolate logic in hooks for unit coverage.
- Visual checks use Playwright screenshot tests and manual verification for 3D scenes when necessary.
- Pre-commit / PR checks: `npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build`.
