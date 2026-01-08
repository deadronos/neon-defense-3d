# TASK020 - Add Canvas Error Boundary & Error Logger

**Status:** Pending  
**Added:** 2026-01-05

## Original request

Add `CanvasErrorBoundary` to catch rendering errors and an `errorLogger` utility for centralized error reporting.

## Implementation plan

- Implement `CanvasErrorBoundary` and use it to wrap `GameCanvas`.
- Create `errorLogger` utility and add tests/mocks to verify calls.
- Add a retry/refresh button to fallback UI that triggers a remount.

## Acceptance criteria

- Canvas errors are caught, fallback UI displayed, and `errorLogger` is called with diagnostic data.
- Tests simulate a render error and assert fallback behavior.

**Related commits:** d4795e8
