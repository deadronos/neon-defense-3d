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
- `vite` 8.3 (build/dev), `typescript` 6.0, `vitest` 5 + `@vitest/coverage-v8` 5 (tests), `jsdom` 30
- `@testing-library/*` (jest-dom v7 — import matchers from `@testing-library/jest-dom/vitest` in the setup file)
- `playwright` 1.63 for e2e tests and screenshots

### Tooling compatibility pins

- `eslint` is held at **9.39.5** (not 10.x): `eslint-plugin-import`, `eslint-plugin-react`, and
  `eslint-plugin-jsx-a11y` do not yet accept ESLint 10. `eslint-plugin-unicorn` is held at
  **65.0.1** because v66+ requires ESLint ≥10.4.
- `typescript` is held at **6.0.3**: the latest `@typescript-eslint` (8.x) supports TS `<6.1.0`.

## Developer commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run test` — run unit tests (Vitest)
- `npm run e2e` — run Playwright end-to-end tests

## Testing & CI

- Unit tests live in `tests/` and use Vitest. Keep tests fast and deterministic and preferentially isolate logic in hooks for unit coverage.
- Visual checks use Playwright screenshot tests and manual verification for 3D scenes when necessary.
- Pre-commit / PR checks: `npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build`.
