# Technical Context

## Stack

- React 19, TypeScript
- @react-three/fiber (R3F) + @react-three/drei helpers
- Vite build + dev server
- Tailwind CSS for overlay UI

## Developer commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm test` — run unit tests (Vitest)

## Testing & CI

- Tests located in `tests/` use Vitest. Keep tests fast and deterministic.
- Static resources and 3D visuals are tested manually or via screenshot-based tests when necessary.
