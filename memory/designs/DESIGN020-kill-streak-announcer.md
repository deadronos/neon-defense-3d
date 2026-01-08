# DESIGN020 - Kill Streak Announcer

**Summary:**
Add a transient UI announcer that displays player kill streaks (e.g., "Double Kill", "Triple Kill") with a visibility timeout and reset behaviour when a new streak starts.

**Motivation:**
Improve player feedback and satisfaction by providing immediate, non-invasive celebration when the player achieves rapid consecutive enemy kills.

**Implementation notes:**

- New UI component `KillStreakAnnouncer` that subscribes to the game state (kill events or kill streak counter in `GameState`).
- Should be testable in isolation with deterministic timers (use timers in tests).
- Behaviour: show message for X seconds, reset timer on new announcement, clear internal state when timer elapses.
- Accessibility: use role=alert or similar to ensure screen readers announce changes without being intrusive.

**Acceptance criteria:**

- Announcer shows the correct message for double/triple (configurable thresholds).
- New announcement during an active visibility timeout resets the timeout and updates text.
- Unit tests cover timer reset and message changes.
- Minimal visual impact on gameplay; non-blocking to input.

**Related commits:**

- 67a5755, fb5048f, e7b8262 (KillStreakAnnouncer additions and fixes)

**Open questions:**

- Should streak thresholds be configurable via a setting or designer constants?
- Do we need animations or simple fade-in/out is sufficient?
