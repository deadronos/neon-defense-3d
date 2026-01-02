# DESIGN018 - Instanced `instanceColor` Shader Gotcha

**Status:** Active
**Added:** 2026-01-02
**Updated:** 2026-01-02

## Problem

After performance/render refactors (switching to simpler unlit materials and heavier instancing), towers and projectiles rendered as **black/uncolored** even though render code was calling `setColorAt()` on instanced meshes and materials had `vertexColors` enabled.

## Root Cause

In the current Three.js shader pipeline used by this project, **instanced colors (`instanceColor`) are gated behind the same shader path as vertex colors (`USE_COLOR`)**.

Practically:

- Setting `mesh.instanceColor` and calling `mesh.setColorAt()` is **not sufficient** by itself.
- Three.js enables the shader varying / multipliers only when the geometry has a vertex `color` attribute (which defines `USE_COLOR`).
- When geometry lacks a vertex `color` attribute, `instanceColor` is effectively ignored in fragment shading, producing “black/uncolored” entities depending on material + scene lighting setup.

This is easy to trip over when swapping geometry/materials or when instanced meshes mount before child geometry is attached.

## Fix (Project Convention)

Centralize the fix in `ensureInstanceColor(mesh, count)`:

1. Ensure `mesh.instanceColor` is present and sized correctly.
2. Ensure the underlying `mesh.geometry` has a vertex `color` attribute (filled with white `1,1,1`) so Three enables the `USE_COLOR` path.
3. Attach `instanceColor` as a geometry attribute.

Implementation lives in:

- `src/game/components/instancing/instancedUtils.ts` (`ensureInstanceColor`)

## Guidelines for Contributors

- If an instanced mesh uses per-instance colors, always call `ensureInstanceColor()` after the geometry is mounted/available.
- Prefer calling it defensively inside `useFrame()` (cheap check) if geometry mounting order is uncertain.
- Materials must be configured to use vertex colors (`vertexColors`).

## Regression Checklist

When touching instanced rendering, verify:

- Towers are colored by `TOWER_CONFIGS[*].color`
- Projectiles inherit tower colors (or their own configured color)
- Enemies (body/ring/shield) still show their expected emissive/unlit coloration

Optional: add a lightweight screenshot test at some point (Playwright) to catch “all black entities” regressions.

