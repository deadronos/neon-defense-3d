# TASK013 - Performance hot paths (targeted optimizations)

**Status:** In Progress  
**Added:** 2026-01-02  
**Updated:** 2026-01-02

## Original Request

Look for hot paths and improve performance overall with 5 targeted enhancements.

## Thought Process

Focus on engine/render hot loops with minimal behavior change: reuse cached collections, avoid per-target sqrt, cache path segment lengths, reuse spatial grid buckets, and avoid O(n*m) projectile targeting in render.

## Implementation Plan

- Extend engine cache and selectors to support reusable vectors and cached spatial data.
- Optimize stepEnemies/stepTowers/stepProjectiles to reuse caches and reduce per-loop allocations.
- Add render-side enemy ID lookup to avoid per-projectile scans.
- Validate behavior parity via unit tests and manual sanity checks.
- Update memory bank progress and task index.

## Progress Tracking

**Overall Status:** In Progress - 97%

### Subtasks

| ID  | Description                                                   | Status      | Updated    | Notes |
| --- | ------------------------------------------------------------- | ----------- | ---------- | ----- |
| 1.1 | Draft requirements/design/task docs                           | Complete    | 2026-01-02 |       |
| 1.2 | Implement engine hot-path cache optimizations                  | Complete    | 2026-01-02 |       |
| 1.3 | Implement render-side projectile target lookup optimization    | Complete    | 2026-01-02 |       |
| 1.4 | Validate behavior parity + update memory/progress              | In Progress | 2026-01-02 | Typecheck fixed; manual FPS sampling done; tests pending |
| 1.5 | Reduce render-loop instance work + avoid duplicate postprocess | Complete    | 2026-01-02 | Mesh count + single composer |
| 1.6 | Address splash/tower/trail/projectile render hot paths         | Complete    | 2026-01-02 | Spatial reuse + pruning + lookAt removal |

## Progress Log

### 2026-01-02

- Created requirements and design documentation for targeted performance improvements.
- Implemented cached enemy positions, spatial grid reuse, squared distance checks, and path segment length caching.
- Added render-side enemy ID lookup for projectile targeting.
- Updated active context/progress docs; tests pending.

### 2026-01-02

- Fixed engine selector scratch vector mutability typing to unblock typecheck.
- Silenced unused-vars warnings in the algorithmic art generator template.

### 2026-01-02

- Switched instanced render hook to use `mesh.count` instead of zeroing unused instances every frame.
- Replaced per-projectile enemy scans with a memoized enemy ID map in rendering.
- Removed duplicate post-processing composer to avoid double full-screen passes.

### 2026-01-02

- Profiled live build (Vite) with rAF sampling: ~39.7 FPS on High vs ~54.0 FPS on Low at 1x speed (no towers placed).

### 2026-01-02

- Reused spatial grid for splash checks and cached enemy positions for tower targeting.
- Removed per-tower candidate array allocations via spatial grid iterator.
- Pruned trail spawn bookkeeping and removed per-projectile lookAt in render loop.
