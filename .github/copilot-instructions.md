# Copilot Instructions

> **Primary Instruction File for Neon Defense 3D**
>
> This file is the Source of Truth for Architecture, Conventions, Workflows, and Tech Stack.
> All agents and developers must follow these guidelines.

## 1. Project Overview

**Neon Defense 3D** is a Tower Defense game built with React 19, TypeScript, and Three.js (@react-three/fiber). It features a distinct "Neon" aesthetic (Pink/Cyan palette).

## 2. Tech Stack

- **Framework:** React 19 + TypeScript
- **3D Engine:** Three.js + @react-three/fiber + @react-three/drei
- **Post-Processing:** @react-three/postprocessing (Bloom effects)
- **Styling:** Tailwind CSS (for UI overlays)
- **Build Tool:** Vite
- **Testing:** Vitest (Unit/Integration), Playwright (E2E)

## 3. Architecture & Patterns

### Game Loop & State Management

- **Central State:** `GameState` (Context) holds the canonical arrays of entities (`enemies`, `towers`, `projectiles`, `effects`) and global values (`money`, `lives`, `wave`).
- **Game Loop:** `GameLoopBridge` (`src/game/components/GameLoop.tsx`) drives the frame-by-frame logic using `useFrame`.
- **Logic Separation:** Logic is split into custom hooks:
  - `useWaveManager`: Handles wave progression and enemy spawning.
  - `useEnemyBehavior`: Updates enemy positions and status effects.
  - `useTowerBehavior`: Handles tower targeting and cooldowns.
  - `useProjectileBehavior`: Manages projectile movement, collision, and damage.

### Rendering Strategy

- **InstancedMesh:** High-count entities (Enemies, Projectiles, Towers) use `InstancedMesh` for performance.
- **Visuals vs. Logic:** Rendering components consume state from `GameState` but do not drive logic. Logic happens in the `GameLoopBridge`.
- **Post-Processing:** Use high emissive values on materials to trigger the Bloom effect.

### Coordinate System

- **Grid:** The game uses a fixed grid (12x8 tiles).
- **World Coordinates:** Calculated centrally using `TILE_SIZE`.
- **Positioning:** Game entities store positions as `readonly [number, number, number]` tuples to avoid GC overhead.

## 4. Workflows

### Adding Content

- **Towers:** Define new towers in `TOWER_CONFIGS` (`src/constants.ts`). Implement visual geometry in `InstancedTowers.tsx` or similar.
- **Enemies:** Define types in `ENEMY_TYPES` (`src/constants.ts`).
- **Maps:** Layouts are defined in `MAP_LAYOUTS` (`src/constants.ts`) using integer codes.

### Testing

- **Unit Tests:** `npm run test`. Located in `src/tests/` (configured via `vitest.config.ts`).
- **E2E Tests:** `npm run e2e`. Located in `tests/e2e/`.

## 5. Coding Standards

### TypeScript

- Target ES2022.
- No `any`. Use strict typing.
- Use `interface` for props and state shapes.

### React

- Functional components with Hooks only.
- Minimize re-renders. Use `React.memo` for static components (like `Tile`).
- Optimize loop performance: avoid creating objects in `useFrame`. Reuse shared vectors/matrices.

### Coding Standards — Quick guide

- Run these checks before committing or opening a PR:
  - **Format:** `npm run format` (check with `npm run format:check`)
  - **Lint:** `npm run lint` → auto-fix with `npm run lint:fix`
  - **Type check:** `npm run typecheck`
  - **Tests:** `npm run test`
- Prettier formatting rules (authoritative): **semi: true**, **singleQuote: true**, **trailingComma: all**, **printWidth: 100**, **tabWidth: 2**, **endOfLine: auto**.
- TypeScript & safety:
  - Project uses `strict` mode. Avoid `any`; prefer `unknown` + narrowing or explicit types.
  - Handle promises explicitly (no-floating-promises); prefer `await` or explicit error handling.
  - Use `import type` for type-only imports (`@typescript-eslint/consistent-type-imports` enforced).
  - Prefer union types over enums for tree-shaking.
- React conventions:
  - Follow hooks rules strictly — `rules-of-hooks` and `exhaustive-deps` are errors.
  - Avoid using array indices as `key` for dynamic lists.
  - Favor stable references (use `useCallback`/`useMemo` only where it prevents re-renders).
- Imports & modules:
  - Follow configured import order (builtin → external → internal `@/**` → parent → sibling → index).
  - Avoid circular imports and unresolved modules (`import/no-cycle`, `import/no-unresolved`).
- Code quality:
  - Prefer `const` where possible; keep functions focused (prefer <150 LOC); cognitive complexity should be low (<15).
  - Keep console usage minimal (`console.warn` / `console.error` allowed, avoid `console.log` in PRs).
- IDE & CI:
  - Install ESLint + Prettier editor plugins for live feedback.
  - Fix lint/format/type errors locally before pushing; Prettier violations are treated as ESLint errors here.
- Gotchas:
  - `react/no-unknown-property` is intentionally disabled for game components in `src/game/**` and `src/components/**`.
  - `@typescript-eslint/no-explicit-any` is currently a **warning** (discouraged but allowed in limited scenarios); prefer better types or document why `any` is necessary.
  - Treat hook and promise-related rules as blocking errors — fix them before merging.

## 6. Detailed Instruction References

For specific domain knowledge, refer to the following instruction files:

- **AI & Prompts:** `.github/instructions/ai-prompt-engineering-safety-best-practices.instructions.md`
- **CI/CD:** `.github/instructions/github-actions-ci-cd-best-practices.instructions.md`
- **Code Review:** `.github/instructions/code-review-generic.instructions.md`
- **Markdown:** `.github/instructions/markdown.instructions.md`
- **Memory Bank:** `.github/instructions/memory-bank.instructions.md`
- **Performance:** `.github/instructions/performance-optimization.instructions.md`
- **Playwright:** `.github/instructions/playwright-typescript.instructions.md`
- **React:** `.github/instructions/reactjs.instructions.md`
- **Spec-Driven Workflow:** `.github/instructions/spec-driven-workflow-v1.instructions.md`
- **TypeScript:** `.github/instructions/typescript-5-es2022.instructions.md`
