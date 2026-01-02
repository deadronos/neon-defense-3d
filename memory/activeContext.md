# Active Context

## Current focus

- Improving runtime performance in engine/render hot paths and adaptive rendering quality.

## Recent changes (code highlights)

- **Engine hot paths:** Added cached path segment lengths, reusable spatial grid buckets, and enemy position caching to reduce per-tick allocations.
- **Tower targeting:** Switched to squared-distance checks in `stepTowers`.
- **Rendering:** Added enemy ID lookup map to avoid per-projectile scans.
- **Rendering:** Added a dynamic resolution scaler that adjusts DPR based on FPS.

## Next steps

- Do a manual gameplay parity pass (movement, firing cadence, rewards, victory after wave 10).
- Verify dynamic DPR behavior on a range of devices and consider exposing tuning to a graphics setting.
- Consider extending cached vector usage into render selectors if GC pressure persists.

## Open decisions

- Visual fidelity vs. performance: whether to reintroduce expensive effects (trails, per-entity lights) via instancing or shaders.
- Sector/progression balancing: decide wave lengths and reward curves for persistent campaign progression.
