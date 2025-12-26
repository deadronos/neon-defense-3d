## 2025-01-24 - [Vector3 Allocations in State]

**Learning:** Storing `THREE.Vector3` instances in Redux/State for thousands of entities causes massive GC churn because they are recreated on every selector/map call.
**Action:** Use primitive tuples `[x, y, z]` in state and only instantiate/set `Vector3` in the `useFrame` loop using reusable dummy objects.
