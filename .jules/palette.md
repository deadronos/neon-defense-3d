## 2024-05-22 - Double-Click Confirmation Pattern

**Learning:** For destructive actions in a game UI (like selling a tower), a "double-click to confirm" pattern on the same button is a highly effective micro-UX improvement. It prevents accidental clicks without breaking flow with a modal dialog.
**Action:** Use this pattern for other destructive, non-critical actions where speed is important but safety is required.

**Learning:** Testing components with `setTimeout` using `vi.useFakeTimers()` in conjunction with `userEvent` can be tricky and lead to timeouts if `advanceTimers` is not configured correctly or if internal event loop delays are involved.
**Action:** For simple state transitions based on time, using `act(() => vi.advanceTimersByTime(...))` with simpler event triggers (like `fireEvent`) can be more robust than full user simulation when fake timers are active.
