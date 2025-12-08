# Active Context

## Current focus

- Optimization: Improve performance and fix OOM crashes.

## Recent changes

- **Performance Refactor:** Replaced individual `Enemy` components with `InstancedEnemies` using `THREE.InstancedMesh`.
- **Optimization:** Removed `Trail` and `PointLight` from enemies to reduce geometry overhead and GPU load.
- **Cleanup:** Verified disposal paths. `InstancedMesh` naturally handles cleanup when the component unmounts (React ref cleanup).
- **Build:** Verified `npm run build` passes.

## Next steps

- Monitor performance.
- Consider optimizing `GameLoopBridge` vector allocations if GC pressure remains high.
- Re-introduce visual effects (Trails) using shaders or instanced lines if needed.

## Open decisions

- **Visuals:** Enemy visuals are now simplified (Dodecahedron + simple color). We might want to improve this later with custom shaders or textures.
