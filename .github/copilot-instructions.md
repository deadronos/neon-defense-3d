# Neon Defense 3D - AI Coding Instructions

## Project Overview

Neon Defense 3D is a Tower Defense game built with **React 19**, **Vite**, **TypeScript**, and **Three.js** (via `@react-three/fiber`).

## Architecture

### Core Components

-- **Game State (`src/game/GameState.tsx`):** Centralized state management using React Context (`GameProvider`). Holds `enemies`, `towers`, `projectiles`, `effects`, and global `gameState`.
-- **Game Loop (`src/game/GameCanvas.tsx` -> `GameLoopBridge`):** The `GameLoopBridge` component uses `useFrame` to handle per-frame logic:
  - Enemy spawning and movement.
  - Tower targeting and firing.
  - Projectile movement and collision detection.
  - Particle effects updates.
-- **Rendering (`src/game/GameCanvas.tsx`):** Renders the 3D scene.
  - **World:** Renders the grid based on `MAP_GRID`.
  - **Entities:** Renders `Tower`, `Enemy`, `Projectile` components based on state data.
  - **Visuals:** Uses geometric primitives (Box, Sphere, Cylinder) rather than external models.
-- **UI Overlay (`src/components/UI.tsx`):** HTML/CSS overlay for HUD, menus, and game controls. Uses Tailwind CSS.

### Data Flow

1.  **State:** `GameState` holds the "source of truth" arrays for all entities.
2.  **Logic:** `GameLoopBridge` reads state, calculates updates (movement, collisions), and calls setters (`setEnemies`, `setProjectiles`, etc.).
3.  **Render:** React components (`Enemy`, `Tower`) subscribe to data changes and render the current state.

## Key Conventions

### Coordinate System

- **Grid:** Logic uses 2D grid coordinates `[x, z]` (0-indexed).
- **World:** 3D world coordinates map to grid: `x_world = x_grid * TILE_SIZE`, `z_world = z_grid * TILE_SIZE`.
- **Up Axis:** Y-axis is up. Ground is at `y=0`.
-- **Tile Size:** Defined in `src/constants.ts` (default `2`).

### State Management

- **Functional Updates:** Always use functional state updates for arrays to avoid race conditions in the game loop (e.g., `setEnemies(prev => ...)`).
- **Immutability:** Treat state objects as immutable. Create shallow copies before modifying properties in the loop.

### Game Logic

-- **Pathfinding:** Pre-calculated BFS path stored in `PATH_WAYPOINTS` (in `src/constants.ts`).
- **Towers:** Defined in `TOWER_CONFIGS`. Stats (damage, range, cooldown) are calculated dynamically based on level using `getTowerStats`.
- **Enemies:** Defined in `ENEMY_TYPES`. Spawning logic is in `GameLoopBridge`.

### Styling & Assets

- **UI:** Tailwind CSS for all overlay UI.
- **3D:** Use `@react-three/drei` helpers (`OrbitControls`, `SoftShadows`, `Trail`) and standard Three.js geometries. Avoid importing external `.gltf` models unless necessary; prefer procedural generation.

## Developer Workflow

### Commands

- `npm run dev`: Start local development server.
- `npm run build`: Build for production.

### Common Tasks

-- **Adding a Tower:**
  1.  Add type to `TowerType` enum in `src/types.ts`.
  2.  Add config to `TOWER_CONFIGS` in `src/constants.ts`.
  3.  Update `Tower` component in `GameCanvas.tsx` if custom visuals are needed.
-- **Adding an Enemy:**
  1.  Add config to `ENEMY_TYPES` in `src/constants.ts`.
  2.  Update spawning logic in `GameLoopBridge` (`src/game/GameCanvas.tsx`) to include the new enemy type.
- **Map Editing:**
  1.  Modify `RAW_MAP` in `src/constants.ts`.
  2.  Ensure `2` (Spawn) and `3` (Base) exist for pathfinding to work.

## Tech Stack Details

- **React:** v19
- **Three.js:** R3F (`@react-three/fiber`)
- **Styling:** Tailwind CSS
- **Build:** Vite

## AI Agent Workflow & Memory

### Core Instructions

- Follow the **Memory Bank** protocols defined in `.github/instructions/memory-bank.instructions.md`.
- Adhere to the **Spec-Driven Workflow** outlined in `.github/instructions/spec-driven-workflow-v1.instructions.md`.
- **Subagents:** If available, utilize specialized agents (check `.github/agents`) for Planning, Implementation, and Review phases.

### Directory Structure

- **Memory Bank:** `/memory` (Root for all context)
- **Designs:** `/memory/designs` (Technical designs and architecture)
- **Task Plans:** `/memory/tasks` (Implementation plans and progress tracking)
