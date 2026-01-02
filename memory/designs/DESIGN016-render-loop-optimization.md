# DESIGN016 — Performance & Render Loop Optimizations

**Status:** Draft
**Updated:** 2026-01-02

## Summary

This design addresses critical performance bottlenecks identified in the render loop and game engine integration. The goal is to stabilize the frame rate at scale (high enemy/tower counts) by reducing garbage collection (GC) pressure, consolidating hot loops, and optimizing React re-renders.

## Problem Statement

1.  **Render Hot Paths**: `Enemies` and `InstancedTowers` iterate over entities multiple times per frame (once per mesh part), often performing redundant calculations (e.g., `Date.now()`).
2.  **Turret Spin Issue**: Turret rotation relies on mutating a shared `dummy` object (`dummy.rotation.y += ...`), leading to order-dependent and frame-rate-dependent state.
3.  **GC Pressure**: `GameState` reconstructs `enemies`, `projectiles`, and lookup maps (`enemiesById`) every frame, generating significant garbage.
4.  **React Re-renders**: The `World` grid (96+ tiles) re-renders every tick because it consumes the rapidly changing `GameContext`.
5.  **Inefficient Queries**: Tower placement and selection use linear scans (`O(N)`) instead of spatial lookups (`O(1)`).

## Proposed Solution

### 1. Render Loop Consolidation & Ref-Based State Access

To decouple the visual update loop from React re-renders and reduce overhead:

- **Render State Ref**: Introduce a `renderStateRef` in `GameProvider`. This mutable object will hold the latest "ready-to-render" arrays of enemies, projectiles, and towers.
  - This Ref is updated in the game step _without_ triggering a React render for the data itself (React render is still triggered for UI updates like money/lives, but visual components will read from the Ref).
- **Custom Frame Loops**: Refactor `Enemies.tsx` and `InstancedTowers.tsx` to use a single `useFrame` loop that reads from `renderStateRef`.
  - Iterate entities **once** per frame.
  - Update all instanced meshes (Body, Shield, Ring) within that single iteration.
  - Compute shared values (e.g., `time`, `position`) once.

### 2. Turret Rotation Fix

- Remove stateful mutation of the shared `dummy` object.
- Calculate rotation deterministically based on `elapsedTime` or `Date.now()`.
  - `rotation = initialRotation + time * speed`

### 3. Engine-to-Render Optimization

- **Cached Entities**: Instead of mapping `EngineEnemy` to `EnemyEntity` (new object) every frame, we will:
  - Reuse `EnemyEntity` objects where possible or use a "Structure of Arrays" approach if needed.
  - For now, we will maintain a **mutable** array in `renderStateRef`. We update the properties (position, hp, etc.) of existing objects in place to match the engine state, matching by ID.
  - Only create/delete objects when the engine entity list changes (spawn/death).
- **Selectors**: Optimize `selectEnemyWorldPosition` to write into a reusable vector or the cached entity directly.

### 4. World Grid Optimization

- **Memoization**: Wrap `Tile` in `React.memo`.
- **Prop Stability**: Ensure props passed to `Tile` (`isValidPlacement`, `onClick`) are stable references.
  - `isValidPlacement` will assume the `towers` list in the `RenderState` ref is the source of truth, removing `towers` as a dependency for the callback.
- **Occupancy Map**: Introduce a `gridOccupancy` Map (Key: `"x,z"`, Value: TowerEntity) in `GameState`.
  - Updated only when towers are placed/sold.
  - Allows O(1) checks for placement validity and selection.

### 5. Implementation Details

#### GameState.tsx

```typescript
// New Ref Structure
interface RenderState {
  enemies: EnemyEntity[]; // Mutable, recycled
  towers: TowerEntity[];
  projectiles: ProjectileEntity[];
  effects: EffectEntity[];
  enemiesById: Map<string, EnemyEntity>; // Cached lookup
  gridOccupancy: Map<string, TowerEntity>; // "x,z" -> Tower
}

// In GameProvider
const renderStateRef = useRef<RenderState>({ ... });

// In step()
// 1. Step Engine
// 2. Sync Engine State -> RenderStateRef (Mutate in place to avoid GC)
// 3. Dispatch 'applyTickResult' (Triggers UI update, but visual components use ref)
```

#### Enemies.tsx / InstancedTowers.tsx

```typescript
const { renderStateRef } = useGame();
useFrame((state) => {
  const time = state.clock.getElapsedTime();
  const enemies = renderStateRef.current.enemies;

  // Single loop
  for (let i = 0; i < enemies.length; i++) {
     updateBody(...);
     updateShield(...);
     updateRing(...);
  }
});
```

## Risks & Mitigations

- **Stale References**: If we mutate objects in `renderStateRef`, React components relying on immutable prop updates might not re-render.
  - _Mitigation_: Visuals (Three.js) use `useFrame` and read refs directly, so they don't need React renders. UI components (Health bars, etc.) might need explicit updates, but we usually rely on `gameState` (UI state) for that. `Enemy` doesn't have individual DOM UI elements (only instanced mesh), so this is safe.
- **Complexity**: Syncing engine state to mutable render state adds complexity.
  - _Mitigation_: Encapsulate the sync logic in a helper function `syncRenderState(engineState, renderState)`.

## Verification Plan

1.  **Visual Regression**: Ensure enemies and towers still render and animate correctly.
2.  **Performance**: Observe frame rate and GC activity (via Chrome DevTools) with 500+ enemies.
3.  **Behavior**: Verify turret rotation is smooth and consistent. Verify placement logic works (can't place on existing towers).
