# Design Document: Tower Overdrive System

## 1. Overview
The **Overdrive System** is an active ability mechanic that allows players to temporarily boost a specific tower's performance at the cost of a subsequent disable period. This introduces a risk-reward element and demands active player participation during intense wave moments.

## 2. Core Mechanic

### Activation
- **Trigger**: Player selects a tower and clicks the "Overdrive" button (or uses a hotkey).
- **Duration**: The effect lasts for **5 seconds**.

### Effects (During Overdrive)
- **Visual**: The tower emits a high-intensity bloom effect and rapid pulse particles. The projectile color brightens significantly.
- **Stats**:
  - **Fire Rate**: +100% (Doubled attack speed)
  - **Damage**: +20%
  - **Range**: No change.

### Penalty (Overheat)
- **Trigger**: Immediately after the Overdrive duration ends.
- **Duration**: **3 seconds**.
- **Effect**: The tower is completely disabled (cannot fire).
- **Visual**: Tower turns dark/grey, emits smoke particles, and has a "cooling down" icon overlay.

## 3. Player Interaction

### UI Controls
1.  **Selection Panel**: When a tower is selected, a new action button "OVERDRIVE" appears active (if cooldown is ready).
2.  **Status Indicators**:
    -   **Ready**: Button is neon green/blue.
    -   **Active**: Button is glowing/pulsing, countdown timer visible on HUD.
    -   **Overheated**: Button is greyed out, with a "Cooling..." text.
    -   **Cooldown**: Button shows a radial fill recharge.

### Feedback
-   **Audio**:
    -   *Activation*: heavy_charge_up.wav
    -   *Loop*: high_pitch_hum.wav
    -   *Overheat*: power_down_steam.wav
-   **Haptic/Screen**: Subtle screen shake if the camera is close to an overdriven tower.

## 4. UI/UX Flow
1.  **Identify Threat**: Player notices a heavy wave or boss that is leaking past the defense.
2.  **Select**: Click the most relevant tower (e.g., a Sniper targeting the boss).
3.  **Execute**: Click "Overdrive".
4.  **Monitor**: Watch the enemy HP melt.
5.  **Consequence**: The tower shuts down. Player must ensure other defenses can cover the gap during the cooldown.

## 5. Technical Requirements
-   **State**: Add `overdriveState` (Ready, Active, Cooled, Disabled) to `TowerEntity`.
-   **Timers**: Track `overdriveTimer` and `coheatTimer` in the game loop.
-   **Stats**: Modify `getTowerStats` to apply multipliers if `overdriveState === Active`.

## 6. Success Metrics
-   **Engagement**: Players use Overdrive at least once per wave after Wave 5.
-   **Balance**: Overdrive does not trivialize bosses; the 3s downtime often results in a leak if used poorly (e.g., just before a fast Scout wave).
