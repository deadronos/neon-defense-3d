# Design Document: Energized Grid (Dynamic Environment)

## 1. Overview
**Energized Grid** introduces dynamic environmental changes to the map. Periodically, specific tiles on the grid become "Energized," offering powerful permanent buffs to towers built on them. This forces players to adapt their build patterns and expand into new areas rather than relying on a single "kill zone."

## 2. Core Mechanic

### Spawning
-   **Trigger**: Every 3 Waves (Wave 3, 6, 9...).
-   **Target**: 1-3 random empty `Grass` tiles are selected.
-   **Duration**: The "Energized" state is permanent for that tile until the game ends (or until used, design choice: *Permanent*).

### The Buff
-   **Effect**: A tower placed on an Energized tile receives **"Overcharge"**.
    -   **Overcharge Stats**: +50% Damage, +20% Range.
    -   **Cost**: No extra cost to build, but the tile might be in a suboptimal location.

### Constraints
-   Tiles must be reachable (not blocked by existing towers, though the system picks empty tiles anyway).
-   Tiles cannot be Path, Spawn, or Base.

## 3. Player Interaction

### Visual Cues
-   **Appearance**: The tile changes texture to a glowing, scrolling neon grid (Gold/Yellow color to distinguish from standard Blue/Green).
-   **Notification**: "Energy Spike Detected!" toast message appears on screen.

### Strategic Choice
-   **Risk**: The tile might be far from the current enemy path.
-   **Reward**: Massive stat boost.
-   **Action**: Player might place a Long-Range Sniper on a far Energized tile, or reroute enemies (if maze building is added later) to pass by it.

## 4. UI/UX Flow
1.  **Wave End**: Wave 3 ends.
2.  **Event**: Camera shakes slightly; 2 random tiles light up Gold.
3.  **Notification**: "New Energized Tiles Available".
4.  **Decision**: Player checks if they have funds to exploit the new tiles.
5.  **Build**: Placing a tower on the Gold tile triggers a "Power Up" sound and a permanent aura around that tower.

## 5. Technical Requirements
-   **Grid State**: Map `TileType` needs a new variant or a metadata layer (e.g., `tileModifiers: Map<string, Modifier>`).
-   **Logic**:
    -   `GameLoop` check for wave completion.
    -   `EnergyManager` to pick valid coordinates.
-   **Rendering**: Update `Tile` component to support an "Energized" prop/variant with different shaders/materials.

## 6. Success Metrics
-   **Map Utilization**: Heatmaps of tower placement show a wider spread across the map compared to the baseline game.
-   **Excitement**: Players react positively to "lucky" spawns near their chokepoints.
