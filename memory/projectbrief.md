# Neon Defense 3D — Project Brief

## One-line summary

Neon Defense 3D is a compact, extendable 3D Tower Defense playground implemented with React, TypeScript and @react-three/fiber. It demonstrates a state-driven game loop, instanced rendering, and fast iteration for gameplay experimentation.

## Goals

- Provide a small, approachable codebase that teaches real-time game patterns in React + Three.js.
- Make it easy for contributors to add towers, enemies, and maps via config-driven extension points (`TOWER_CONFIGS`, `ENEMY_TYPES`, `MAP_LAYOUTS`).
- Keep game logic testable and separated from rendering by centralizing runtime data in `GameState` and using hooks for behavior (`useWaveManager`, `useEnemyBehavior`, `useTowerBehavior`, `useProjectileBehavior`).
- Use performant rendering techniques (instanced meshes) and keep the code suitable for iterative experimentation.

## Minimal Acceptance Criteria (for this repository)

- Starts locally with `npm run dev` and displays the 3D scene and UI overlay.
- Core runtime: `src/game/GameState.tsx` (GameProvider), `src/game/components/GameLoop.tsx` (GameLoopBridge with `useFrame`), and `src/game/GameCanvas.tsx` (scene + rendering).
- Map, tile sizing and pathfinding are defined in `src/constants.ts` (tile size `TILE_SIZE`, `MAP_LAYOUTS`, `generatePath` using BFS).
- Rendering uses `InstancedMesh` for enemies and projectiles (see `src/game/components/Enemies.tsx` and `src/game/components/Projectiles.tsx`).
- The repo contains a `/memory` folder with high-level project context and tracked tasks.

## Requirements

Reference and update `/memory/requirements.md` as needed to track evolving requirements.
