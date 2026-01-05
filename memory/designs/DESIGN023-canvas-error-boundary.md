# DESIGN023 - Canvas Error Boundary & Centralized Error Logging

**Summary:**
Add `CanvasErrorBoundary` to capture and handle rendering errors from the 3D renderer and provide safe fallback UI with controlled logs.

**Motivation:**
Rendering errors can crash the canvas and leave the app in an unusable state. A boundary allows graceful degradation and centralized logging for diagnostics.

**Implementation notes:**
- Add `CanvasErrorBoundary` component that wraps the R3F canvas and renders a simple fallback (retry button, error message) if an error occurs.
- Add `errorLogger` utility to centralize logging (console + optional remote endpoint in future).
- Add tests that simulate r3f errors and assert fallback UI and log calls.

**Acceptance criteria:**
- Rendering errors inside canvas are caught and the fallback UI shown.
- Error details are forwarded to `errorLogger` (and not leaked to users in production).

**Related commits:** d4795e8
