# Product Context

## Why this project exists

Neon Defense 3D provides a focused playground for learning and experimenting with real-time game architecture in the browser using React + Three.js. It emphasizes:

- How to structure a deterministic game loop in React using `useFrame` and a centralized `GameState` provider.
- How to separate game logic from rendering so behaviors can be unit-tested and reasoned about.
- Practical performance patterns for web 3D, including `InstancedMesh` usage for enemies and projectiles.

## Primary users

- Frontend engineers and students learning real-time systems and 3D rendering in React.
- Developers experimenting with gameplay mechanics, tower balancing, and procedural maps.
- Contributors who want a clear starting point to add towers, enemies, maps, or UI features.

## User experience goals

- Fast developer feedback loop: run `npm run dev`, tweak configs, and iterate quickly.
- Clear extension points: add new tower or enemy types via `TOWER_CONFIGS` and `ENEMY_TYPES` in `src/constants.ts`.
- Predictable gameplay flow: waves, spawning, pathfinding, and victory/tech-tree transitions are deterministic and easy to modify.

## Core product features

- Grid-based maps with BFS path generation from spawn to base (`generatePath`).
- Wave system and spawner logic (`useWaveManager`) with phases: preparing → spawning → active → completed.
- Towers with configurable stats, placement, upgrading and selling (`useTowerState`).
- Projectile handling, collision resolution, and reward calculations (`useProjectileBehavior`).
- Lightweight tech tree / victory state that grants research points between sectors.
