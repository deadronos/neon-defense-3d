# Active Context

## Current focus

- Improving runtime performance in engine/render hot paths and adaptive rendering quality.

## Recent changes (code highlights)

- Implemented fixed-timestep simulation loop with render interpolation in the render bridge.
- Batched world tiles into an instanced mesh with a single grid overlay and hover updates.
- Downgraded instanced materials (Lambert/Basic) for enemies, towers, and projectiles.

- **Engine hot paths:** Added cached path segment lengths, reusable spatial grid buckets, and enemy position caching to reduce per-tick allocations.
- **Tower targeting:** Switched to squared-distance checks in `stepTowers`.
- **Rendering:** Avoided per-projectile enemy scans with a memoized enemy ID map.
- **Rendering:** Instanced render hook now uses `mesh.count` to skip zeroing unused instances per frame.
- **Rendering:** Removed duplicate post-processing composer to avoid double full-screen passes.
- **Rendering:** Removed per-projectile lookAt and pruned trail spawn bookkeeping to reduce per-frame CPU.
- **Engine:** Reused spatial grid for splash checks and cached enemy positions for tower targeting.
- **Rendering:** Added a dynamic resolution scaler that adjusts DPR based on FPS.
- **Testing:** Added unit coverage for DPR scaling, tower cooldown/targeting, projectile shield/freeze, and runtime checkpoint/skip-wave edges.
- **Rendering:** Fixed world grid overlay rotation so it sits on the ground plane again.
- **Rendering:** Switched world/enemy materials to unlit and brightened tile colors for clearer map/path/enemy visibility.
- **Rendering:** Fixed instanced tower/projectile coloring by ensuring instanced meshes have both `instanceColor` _and_ a vertex `color` attribute so Three enables the shader color path and applies `instanceColor` at render time.
- **Rendering:** Aligned the world grid overlay with tile boundaries (grid line geometry is offset by half a tile).

- **UI (responsive):** Build menu, `TopBar` and `UpgradeInspector` made responsive: buttons/icon sizes, wrapping and stacked layouts on small screens to prevent overflow.

- **Audio:** Synth music engine enhanced — added lowpass filter, delay-based feedback, slow LFO (subtle detune/chorus), an arpeggio oscillator for movement, and a procedural convolver impulse reverb. Tests and mocks updated.
- **Bug Fix:** Fixed critical save/load interaction bug where loaded games were non-interactive. Implemented a `sessionNonce` strategy to force a full 3D scene remount upon loading a checkpoint, ensuring fresh event binding.
- **New features:** Added `KillStreakAnnouncer` (UI announcer), Synergy system (tower synergies + `SynergyLinks` visuals), upgrades support in engine step functions, `CanvasErrorBoundary` for robust rendering failure handling, and `currentMapIndex` for map selection and management.

## Next steps

- Do a manual gameplay parity pass (movement, firing cadence, rewards, victory after wave 10).
- Verify dynamic DPR behavior on a range of devices and consider exposing tuning to a graphics setting.
- Consider extending cached vector usage into render selectors if GC pressure persists.
- Add more unit tests for low coverage areas and keep improving branch coverage (recently added tests for `renderStateUtils`, `transforms`, and `Synth` — coverage improved to ~83.7% statements / ~85.3% lines).

## Open decisions

- Visual fidelity vs. performance: whether to reintroduce expensive effects (trails, per-entity lights) via instancing or shaders.
- Sector/progression balancing: decide wave lengths and reward curves for persistent campaign progression.
