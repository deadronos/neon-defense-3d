# Design Document: Neon Synergy System

## 1. Overview
The **Neon Synergy System** encourages strategic tower placement by granting passive bonuses when compatible tower types are placed adjacent to each other. This transforms the grid from a collection of isolated units into a connected circuit board of defenses.

## 2. Core Mechanic

### Adjacency Logic
-   **Grid Check**: Orthogonal adjacency (Up, Down, Left, Right). Diagonals do not count.
-   **Trigger**: Bonuses apply instantly when two compatible towers are adjacent. Removing one removes the bonus.

### Synergy Types
1.  **Synchronized Fire (Rapid + Rapid)**
    -   *Requirement*: Two Rapid towers adjacent.
    -   *Bonus*: +15% Fire Rate for both.
    -   *Visual*: A thin, rapid pulsing cyan laser connects the two towers.

2.  **Triangulation (Sniper + Sniper)**
    -   *Requirement*: Two Sniper towers adjacent.
    -   *Bonus*: +20% Range and +10% Critical Hit Chance.
    -   *Visual*: A static, solid purple beam connects the bases.

3.  **Cover Fire (Basic + Any)**
    -   *Requirement*: A Basic tower adjacent to any other type.
    -   *Bonus*: The Basic tower gains +10% Damage; the neighbor gains +5% Range.
    -   *Visual*: A gentle green flow from the Basic tower to the neighbor.

### Stacking
-   A tower can be part of multiple synergies (e.g., a Rapid tower surrounded by 3 other Rapids gets the bonus 3 times, capped at +50%).

## 3. Player Interaction

### Placement Preview
-   **Hover State**: When hovering a "ghost" tower to build, if it will create a synergy, draw faint connection lines to existing neighbors.
-   **Tooltip**: The placement tooltip shows text like "Synergy: Synchronized Fire (+15% ASPD)".

### Inspection
-   **Selection**: Clicking a tower highlights its active connections and lists current buffs in the stats panel.

## 4. UI/UX Flow
1.  **Planning**: Player looks at their current layout.
2.  **Decision**: "If I place another Sniper here, I get the range bonus."
3.  **Build**: Player places the tower.
4.  **Feedback**: Sound effect (circuit_connect.wav) and visual beam confirms the link.

## 5. Technical Requirements
-   **Graph Update**: On `placeTower` or `sellTower`, recalculate adjacency graph.
-   **Stat Calculation**: Update `getTowerStats` to accept a `neighborTypes` or `activeSynergies` parameter.
-   **Rendering**: New `SynergyLinks` component in Three.js to render the connection beams.

## 6. Success Metrics
-   **Density**: Players tend to build clusters rather than scattered towers.
-   **Variety**: Players mix Basic towers into late-game builds to utilize "Cover Fire" rather than only spamming high-tier towers.
