# Gameplay & Level Improvement Suggestions

## 1. Level Design Enhancements

### 1.1. Dynamic Map Layouts

- **Current State**: Static 12x8 grid.
- **Suggestion**: Implement multiple map definitions in `constants.ts` and allow the player to choose a map or progress through a campaign of maps.
- **Twist**: **"Glitch Tiles"** - Random tiles that change properties every wave (e.g., switch from Buildable to Path, forcing the player to sell/move towers, or enemies to re-route).

### 1.2. Verticality (Leveraging 3D)

- **Concept**: Since the game is 3D, introduce "High Ground" tiles.
- **Mechanic**: Towers placed on elevated blocks gain +20% Range and can ignore visual obstructions (if line-of-sight logic is added).
- **Enemy Interaction**: Flying enemies flying _over_ low-ground towers but being vulnerable to high-ground AA towers.

### 1.3. Environmental Hazards

- **"Neon Storms"**: Random weather events that debuff specific tower types (e.g., "Static Storm" disables electronic towers / Rapid towers for 10 seconds).
- **"Power Nodes"**: Destructible objectives on the map that enemies might attack instead of the base. protecting them gives bonus resources.

## 2. Gameplay Mechanics

### 2.1. Specialized Tower Types

- **AOE Mortar ("Pulse Grenade")**: Launches a slow projectile that explodes in a radius. Good against swarms (`Basic` enemies).
- **Slow/Lockdown ("Stasis Field")**: Doesn't damage but slows enemies by 50% in range. Vital for managing `Fast` enemies.
- **Chain Lightning ("Arc Coil")**: Attacks bounce to 3 nearby enemies.

### 2.2. Enemy Complexity

- **Stealth Units ("Ghosts")**: Invisible to towers until they take damage or pass near a "Scanner" tower (or a specific tower upgrade).
- **Healer Units ("Nanobots")**: Hover behind Tanks and repair them. Player must target them first manually or use AOE.
- **Shield Regenerators**: Enemies that regenerate shield if not hit for 2 seconds (promotes "focus fire" gameplay).

### 2.3. Economy & Upgrades

- **Tech Tree**: Spend "Research Points" (earned by clearing waves perfectly) to permanently unlock stats (e.g., "Global +5% Laser Damage").
- **In-Match Upgrades**: Allow towers to be upgraded to Level 2 and 3.
  - _Level 2_: +Stats
  - _Level 3_: Choose a specialization (e.g., Sniper Lvl 3 -> "Railgun" (pierces enemies) OR "Headhunter" (x3 Crit damage)).

### 2.4. "Cyber-Deck" Abilities (Player Powers)

- Cooldown-based active abilities acting as "spells".
  - **"System Purge"**: Deals small damage to ALL enemies on screen.
  - **"Time Dilation"**: Slows game speed (and enemies) by 50% for 5 seconds while towers fire at normal speed.
  - **"Firewall"**: Temporarily blocks a path tile, forcing enemies to turn around or wait.

## 3. Visual & Audio Polish

### 3.1. Reactive Environment

- Map pulse to the beat of the background music.
- Towers light up when the "Bass" kicks in.

### 3.2. Kill Streaks

- Visual announcer text ("DOUBLE KILL", "RAMPAGE") neon text overlays when towers destroy many enemies quickly.
