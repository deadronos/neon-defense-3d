export interface FrameStatsConfig {
  /** Sliding window in ms. Defaults to 1000. */
  windowMs?: number;
}

const DEFAULT_DELTA_MS = 16.667;
const DEFAULT_WINDOW_MS = 1000;

/** Rolling FPS / frame-time accumulator. No React, no Three.
 *
 *  Records recent frame timestamps, drops samples outside the window,
 *  and exposes the most recent FPS and frame delta.
 */
export class RollingFrameStats {
  private readonly windowMs: number;
  private readonly samples: number[] = [];
  private lastDeltaMs = 0;
  private lastFps = 0;

  constructor(config: FrameStatsConfig = {}) {
    this.windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;
  }

  /** Call once per frame with the current performance.now() value. */
  recordFrame(nowMs: number): void {
    const last = this.samples.at(-1);
    this.lastDeltaMs = last === undefined ? DEFAULT_DELTA_MS : nowMs - last;
    this.samples.push(nowMs);
    const cutoff = nowMs - this.windowMs;
    while (this.samples.length > 1 && this.samples[0] < cutoff) {
      this.samples.shift();
    }
    const first = this.samples[0];
    if (this.samples.length >= 2 && nowMs > first) {
      this.lastFps = ((this.samples.length - 1) * 1000) / (nowMs - first);
    }
  }

  /** Most recent instantaneous FPS. */
  get fps(): number {
    return this.lastFps;
  }

  /** Most recent per-frame delta in ms. */
  get deltaMs(): number {
    return this.lastDeltaMs;
  }

  /** Number of samples currently in the window. */
  get sampleCount(): number {
    return this.samples.length;
  }
}
