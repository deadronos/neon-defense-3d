# TASK017 - Implement Kill Streak Announcer

**Status:** Pending  
**Added:** 2026-01-05

## Original request

Implement a `KillStreakAnnouncer` UI component that displays transient announcements (double/triple kills). Include unit tests for timer/reset logic and ensure accessibility semantics.

## Implementation plan

- Add `KillStreakAnnouncer` component under `src/components/ui/` and a small selector in `GameState` or an announcer event feed.
- Add unit tests in `src/tests/components/KillStreakAnnouncer.test.tsx` verifying message and timer reset behavior.
- Add small e2e/check to verify announcements appear after simulated kills (optional).

## Acceptance criteria

- Component displays correct messages for streak thresholds.
- Timer resets and updates text on new announcements.
- Tests pass and CI coverage includes the new tests.

## Notes

Related commits: 67a5755, fb5048f, e7b8262
