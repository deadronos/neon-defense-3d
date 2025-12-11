# Technical Context

## Stack

- React 19, TypeScript
- @react-three/fiber (R3F) + @react-three/drei helpers
- @react-three/postprocessing for post effects
- Three.js (`three`) for 3D primitives
- Vite for dev server and build
- Tailwind CSS for HUD/overlay styling

## Notable dependencies (from `package.json`)

- `react`, `react-dom` (v19)
- `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
- `vite` (build/dev), `typescript`, `vitest` (tests)
- `playwright` for e2e tests and screenshots

## Developer commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run test` — run unit tests (Vitest)
- `npm run e2e` — run Playwright end-to-end tests

## Testing & CI

- Unit tests live in `tests/` and use Vitest. Keep tests fast and deterministic and preferentially isolate logic in hooks for unit coverage.
- Visual checks use Playwright screenshot tests and manual verification for 3D scenes when necessary.
