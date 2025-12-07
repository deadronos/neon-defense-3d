# Neon Defense 3D — Project Brief

## One-line summary

Neon Defense 3D is a lightweight, educational 3D Tower Defense game built with React + TypeScript + @react-three/fiber designed for experimentation, teaching, and fast iteration.

## Goals

- Provide a compact, extendable 3D tower-defense playground that demonstrates a real-time game loop, state-driven architecture, and Three.js rendering in React.
- Be easy for contributors to extend (add towers, enemies, maps) by following clear conventions.
- Maintain a small, testable codebase with good patterns for game loops, state updates, and unit tests.

## Minimal Acceptance Criteria (for this repository)

- Runs locally via `npm run dev` and renders a playable area.
- Core game loop and state live in `src/game/GameState.tsx` and `src/game/GameCanvas.tsx`.
- The repository includes memory documentation (this `/memory` folder) capturing project context and tasks.
