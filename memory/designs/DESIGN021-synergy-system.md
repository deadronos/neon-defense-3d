# DESIGN021 - Synergy System (Tower Synergies)

**Summary:**
Introduce a synergy system where specific combinations or proximities of towers enable temporary bonuses (e.g., synchronized fire, triangulation, cover fire) with visual links.

**Motivation:**
Create deeper strategic choices when placing towers and encourage mixed-build strategies. Provide visual feedback (links) so players can reason about active synergies.

**Implementation notes:**
- Add `activeSynergies` to `GameState` and compute synergies in a new `useSynergyManager` or within `stepTowers` pass.
- Visual links rendered by `SynergyLinks` component (instanced lines or thin geometries) with low perf overhead.
- Synergy effects map to small, testable modifications (e.g., rate-of-fire multiplier, range bonuses) and are reversible.

**Acceptance criteria:**
- Synergies are detected and added to `GameState.activeSynergies` deterministically.
- Visual links render for active synergies and update on placement/sell of towers.
- Unit tests cover detection logic and basic effect application.

**Related commits:**
- 6bb1181 (Synergy system implementation)

**Open questions:**
- Which synergies are enabled initially vs. future unlocks via tech tree.
