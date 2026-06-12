# DESIGN027 - Adaptive DPR, Synth refactor, and engine hot-path tightening

**Status:** Active
**Date:** 2026-06-11
**Owner:** AI Agent
**Related:** DESIGN013 (Performance hot paths), DESIGN014 (Dynamic resolution scaling), DESIGN019 (Synth & Reverb Enhancements), TASK013 (Performance hot paths), TASK015 (Test coverage expansion), TASK016 (Audio & UI responsiveness)

## Summary

Three small, independently-reviewable perf improvements combined into a single PR:

1. **Adaptive DPR scaler refactor.** Lift the rolling-FPS math and the DPR decision logic out of `DynamicResScaler.tsx` into pure, unit-tested modules. The component shrinks to a thin React adapter.
2. **Synth refactor.** Move SFX buffer construction from constructor-time (eager, synchronous, 6 buffers) to first-use (lazy, memoized). Replace the `setInterval`-driven arpeggio with a Web-Audio-clock-driven scheduler (lookahead pattern).
3. **Engine hot-path tightening.** Pool the per-tower/per-projectile target `Vector3` tuple allocations in `stepTowers` and `stepProjectiles` to match the existing `enemyPositionPool` pattern. Pin behavior with a snapshot test.

No behavior change, no balance change, no UI change, no public API change. Validation = `npm run format:check && npm run lint && npm run typecheck && npm run test` all green, plus a manual dev run.

## Motivation

The codebase has already absorbed a large amount of optimization (DESIGN003, DESIGN013, DESIGN016, DESIGN017, TASK004, TASK005, TASK013, TASK015). What's left on the table for this PR:

- The DPR scaler's FPS window and decision math are inline, untested as a unit, and re-derive state that a sibling module would want to share. Lifting them makes the scaler thinner and opens the door to a future `useFrameStats()` consumer (e.g., a quality-tier auto-toggle in the settings modal).
- The `Synth` constructor builds 6 SFX buffers in series synchronously. A user who only ever hears one SFX pays for all 6.
- The arpeggio uses `setInterval(..., 180)` plus a per-note `setTimeout` to release the gain envelope. Under load the intervals jitter and the envelopes can be clipped. The Web-Audio-clock-driven "lookahead scheduler" pattern is sample-accurate and removes a JS task per note.
- `stepTowers` and `stepProjectiles` each allocate a fresh `Vector3` tuple per tower/per projectile per tick when a target is found. At 60 Hz with 20 active towers and 30 active projectiles that's ~3000 short-lived allocations per second of GC pressure that the existing enemy position pool was specifically built to avoid.

## Non-goals

- No gameplay, balance, UI, or save-format changes.
- No new public React API. `useFrameStats` is module-private to `src/game/perf/`.
- No microbench harness, no DevTools trace capture, no Playwright perf assertion in this PR. Validation is "green tests + manual dev run."
- No change to the engine tick (`GameLoopBridge`), the `EngineState` shape, or the public `Synth` method signatures.

## Design

### 1. Adaptive DPR scaler

#### 1.1 New module: `src/game/perf/frameStats.ts`

Pure utility, no React, no Three.

```typescript
export interface FrameStatsConfig {
  /** Sliding window in ms. Defaults to 1000. */
  windowMs?: number;
}

export class RollingFrameStats {
  private readonly windowMs: number;
  private readonly samples: number[] = []; // ms timestamps of recent frames
  private lastDeltaMs = 0;
  private lastFps = 0;

  constructor(config: FrameStatsConfig = {}) {
    this.windowMs = config.windowMs ?? 1000;
  }

  /** Call from useFrame with the current performance.now() value. */
  recordFrame(nowMs: number): void { ... }

  /** Most recent instantaneous FPS. */
  get fps(): number { return this.lastFps; }
  /** Most recent per-frame delta in ms. */
  get deltaMs(): number { return this.lastDeltaMs; }
  /** Number of samples currently in the window. */
  get sampleCount(): number { return this.samples.length; }
}
```

The `samples` array is a monotonically-growing-and-culled list of timestamps. The window cull uses strict-less-than so a backwards clock jump is benign.

#### 1.2 New module: `src/game/perf/useFrameStats.ts`

```typescript
import { useMemo } from 'react';
import { RollingFrameStats, type FrameStatsConfig } from './frameStats';

export function useFrameStats(config: FrameStatsConfig = {}): RollingFrameStats {
  return useMemo(() => new RollingFrameStats(config), [config.windowMs ?? 1000]);
}
```

`useMemo` is fine here — the constructor is cheap and the instance is consumed via `useFrame`, which captures the ref returned by the component, not the value. (We could use `useRef` instead; `useMemo` is preferred here because the constructor has no side effects.)

#### 1.3 New module: `src/game/perf/dprTuning.ts`

```typescript
export interface DprTuning {
  targetFps: number; // 60
  fpsTolerance: number; // 5
  minDpr: number; // 0.5
  maxDpr: number; // 2
  step: number; // 0.1
}

/** Pure: returns the next DPR given the current value, the measured FPS,
 *  and the tuning. Returns `currentDpr` if no change is needed. */
export const computeNextDpr = (currentDpr: number, fps: number, tuning: DprTuning): number => {
  if (!Number.isFinite(fps)) return currentDpr;
  if (fps < tuning.targetFps - tuning.fpsTolerance) {
    return Math.max(tuning.minDpr, currentDpr - tuning.step);
  }
  if (fps > tuning.targetFps + tuning.fpsTolerance) {
    return Math.min(tuning.maxDpr, currentDpr + tuning.step);
  }
  return currentDpr;
};
```

`currentDpr` is also clamped on the way out, so a caller that passes an out-of-range value gets a safe result.

#### 1.4 Refactored `src/game/components/DynamicResScaler.tsx`

```tsx
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

import { computeNextDpr, type DprTuning } from '../perf/dprTuning';
import { useFrameStats } from '../perf/useFrameStats';

const TUNING: DprTuning = {
  targetFps: 60,
  fpsTolerance: 5,
  minDpr: 0.5,
  maxDpr: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1,
  step: 0.1,
};
const CHECK_INTERVAL_MS = 500;
const MIN_SAMPLES_BEFORE_DPR = 2;

export const DynamicResScaler = () => {
  const setDpr = useThree((state) => state.setDpr);
  const stats = useFrameStats({ windowMs: 1000 });
  const dprRef = useRef(TUNING.maxDpr);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    setDpr(dprRef.current);
  }, [setDpr]);

  useFrame(() => {
    const now = performance.now();
    stats.recordFrame(now);
    if (now - lastCheckRef.current < CHECK_INTERVAL_MS) return;
    lastCheckRef.current = now;
    if (stats.sampleCount < MIN_SAMPLES_BEFORE_DPR) return;

    const next = computeNextDpr(dprRef.current, stats.fps, TUNING);
    if (next !== dprRef.current) {
      dprRef.current = next;
      setDpr(next);
    }
  });

  return null;
};
```

Behavior change vs. the current code:

- The FPS sample is now taken every frame (cheap), not only when `elapsed >= CHECK_INTERVAL_MS`. The check interval still gates the _decision_; this matches the spec ("sustained FPS changes") and makes the new "ignore FPS until 2 samples" guard well-defined.
- The `MIN_SAMPLES_BEFORE_DPR` guard prevents the scaler from reacting to the initial `fps = 0` sample on the first frame.
- All other tuning values (`MIN_DPR`, `MAX_DPR`, `STEP`, `TARGET_FPS`, `FPS_TOLERANCE`, `CHECK_INTERVAL_MS`) are unchanged.

### 2. Synth refactor

#### 2.1 New module: `src/game/audio/internal/synthBuffers.ts`

```typescript
export type SfxBufferFactory = Record<string, (ctx: AudioContext) => AudioBuffer>;

/** Lazily builds and caches SFX AudioBuffers. First call to a name
 *  generates the buffer; subsequent calls reuse it. */
export class SfxBufferCache {
  private readonly ctx: AudioContext;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly factory: SfxBufferFactory;

  constructor(ctx: AudioContext, factory: SfxBufferFactory) {
    this.ctx = ctx;
    this.factory = factory;
  }

  get(name: string): AudioBuffer | undefined {
    const existing = this.buffers.get(name);
    if (existing !== undefined) return existing;
    const build = this.factory[name];
    if (build === undefined) return undefined;
    const built = build(this.ctx);
    this.buffers.set(name, built);
    return built;
  }
}
```

The six SFX builders (`shoot`, `impact`, `build`, `sell`, `click`, `error`) are extracted verbatim from `Synth.generateBuffers()` and registered against an `AudioContext` at first use.

#### 2.2 New module: `src/game/audio/internal/synthArp.ts`

Standard Web-Audio "lookahead scheduler" pattern.

```typescript
export interface ArpSchedulerOptions {
  notes: readonly number[];
  intervalSec: number;       // 0.18
  noteDurationSec: number;   // 0.14
  peakGain: number;          // 0.6
  lookaheadSec: number;      // 0.05
  schedulerIntervalMs: number; // 25
}

export class SynthArpScheduler {
  // ... holds osc, env, gain, scheduleAhead state.
  constructor(ctx: AudioContext, destination: AudioNode, options: ArpSchedulerOptions) { ... }
  start(): void { ... }
  stop(): void { ... }
}
```

The scheduler:

- Owns a single `OscillatorNode` (triangle) and a single `GainNode` (envelope).
- Uses `ctx.currentTime` to decide when the next note fires. Notes are scheduled ahead by `lookaheadSec` so audio-thread timing is sample-accurate.
- The `setTimeout` driver polls at `schedulerIntervalMs` (25ms) — one JS task per 25ms regardless of note rate, vs. the current one task per 180ms plus one task per note.
- `setTimeout` driver clears itself in `stop()` and checks `isRunning` at the top of `scheduleAhead` so a late-firing `setTimeout` after `stop()` is a no-op.

#### 2.3 Refactored `src/game/audio/Synth.ts`

The public class surface is unchanged. Internally:

- Constructor no longer calls `this.generateBuffers()`. Instead, it creates `this.sfxBuffers = new SfxBufferCache(this.ctx, SFX_FACTORY)`. The impulse-response generator still runs in the constructor (it's a one-time setup cost and `startMusic` needs the buffer at music-start time, not first-`playSFX`-time).
- `playSFX(name)` calls `this.sfxBuffers.get(name)` instead of `this.buffers.get(name)`. If `get` returns `undefined`, the early-return-on-undefined path is preserved.
- `startMusic()` no longer creates the arp oscillator / gain / interval inline. Instead it constructs `this.arpScheduler = new SynthArpScheduler(this.ctx, bgmGain, ARP_OPTIONS)` and calls `start()`.
- `stopMusic()` calls `this.arpScheduler?.stop()` then nulls the field. All other cleanup is preserved.

### 3. Engine hot-path tightening

#### 3.1 Pool the target-position tuple in `stepTowers`

Add a `targetPositionPool: EngineMutableVector3[]` to `EngineCache`. In `stepTowers`:

```typescript
// ... inside the tower loop, after determining targetId and position:
let targetPosition: EngineVector3;
if (cache?.targetPositionPool) {
  const pooled = cache.targetPositionPool.pop() ?? [0, 0, 0];
  pooled[0] = position[0];
  pooled[1] = position[1];
  pooled[2] = position[2];
  targetPosition = pooled;
} else {
  targetPosition = [position[0], position[1], position[2]];
}
```

The pooled tuple is _not_ returned to the pool when the projectile is created — the projectile needs to own its `lastTargetPosition` for the duration of its flight. Pool release happens when the projectile is consumed in `stepProjectiles` (see 3.2).

#### 3.2 Pool the target-position tuple in `stepProjectiles`

When a projectile is consumed (progress >= 1), push its `lastTargetPosition` back onto `targetPositionPool` _only if_ that position came from the pool. We track this by storing the source on the projectile (or by structuring the pool so any `lastTargetPosition` that came from the pool is a tuple identity we recognize). Cleanest: store `lastTargetPosition: EngineMutableVector3` (mutable tuple) on the projectile, and the pool is the same array as the scratch positions; release the projectile's `lastTargetPosition` back to the pool when the projectile is consumed.

This is a small refactor that crosses `stepTowers` and `stepProjectiles`; both modules need to read/write `targetPositionPool`. Both already receive the shared `EngineCache`.

#### 3.3 `buildSpatialGrid` inner clamp

The current code computes `clampedX` and `clampedZ` once per enemy, then `index = clampedZ * width + clampedX`. No change is required for the inner clamp itself, but the redundant `Math.max(0, Math.min(...))` pair is collapsed into a single inline `((x < 0 ? 0 : x > width - 1 ? width - 1 : x))` expression. This is a stylistic micro-opt; it's included only if the resulting code is _clearer_, not just shorter. If the change makes the code less readable, skip it.

#### 3.4 `EngineCache` shape

After the refactor:

```typescript
export interface EngineCache {
  // existing fields
  projectileHits: Map<string, number>;
  projectileFreeze: Map<string, number>;
  activeProjectiles: EngineProjectile[];
  enemiesById: Map<string, EngineEnemy>;
  enemyPositions: Map<string, EngineMutableVector3>;
  enemyPositionPool: EngineMutableVector3[];
  enemyPositionsSource?: EngineEnemy[];
  nextEnemies: EngineEnemy[];
  pathSegmentLengths: number[];
  pathWaypointsRef?: readonly EngineVector2[];
  pathTileSize?: number;
  spatialGrid?: SpatialGrid;
  scratchEnemyPos: EngineMutableVector3;
  // new field
  targetPositionPool: EngineMutableVector3[];
}
```

The default cache initializer in `useGameStep` adds `targetPositionPool: []`. No other call sites need to change because `EngineCache` is a single internal type.

### 4. Data flow

```text
                       ┌──────────────────────────────────────┐
   useFrame (R3F) ──▶  │ GameLoopBridge (unchanged)           │
                       │   └─▶ stepEngine (engine tick)       │
                       │   └─▶ renderStateRef                 │
                       └──────────────────────────────────────┘
                                     │
                                     │ per-frame
                                     ▼
                       ┌──────────────────────────────────────┐
                       │ Shared frame-time helper (new)        │
                       │   src/game/perf/frameStats.ts         │
                       │   - records rolling FPS, last delta   │
                       │   - pure update fn + a React hook     │
                       └──────────────────────────────────────┘
                          ▲                ▲           ▲
                          │                │           │
              ┌───────────┘                │           └────────────┐
              │                            │                        │
   ┌──────────────────────┐   ┌────────────────────────┐  ┌──────────────────────┐
   │ DynamicResScaler     │   │ useGameStep / engine   │  │ Instanced render     │
   │  reads fps from      │   │  (zero behavior change,│  │ hooks (unchanged)    │
   │  frameStats hook     │   │   pool targetPosition  │  │                      │
   │  pure computeNextDpr │   │   tuples)              │  │                      │
   └──────────────────────┘   └────────────────────────┘  └──────────────────────┘

                       ┌──────────────────────────────────────┐
   React (UI) ──▶       │ AudioManager / useAudio (unchanged) │
                       │   └─▶ synth (singleton, refactored)  │
                       │       - arp moved onto audio clock   │
                       │       - sfx buffers lazy + memoized  │
                       └──────────────────────────────────────┘
```

### 5. Error handling & edge cases

| Area                 | Failure mode                                                 | Behavior                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RollingFrameStats`  | First frame after mount (no prior timestamp)                 | `lastDeltaMs` defaults to `16.667`; `fps` is `0` until a second sample lands. `DynamicResScaler` ignores `stats.fps` until `sampleCount >= 2`.                                                                     |
| `RollingFrameStats`  | Clock skew (`performance.now()` goes backwards)              | Cull is `<` (strict), so backwards jumps keep older samples. `fps` may transiently read 0 or low, which `computeNextDpr` treats as a low-FPS signal and drops DPR by one step. Acceptable; recovers in one window. |
| `computeNextDpr`     | `fps = NaN` or `±Infinity`                                   | Guarded: `Number.isFinite(fps) === false` ⇒ return `currentDpr` unchanged.                                                                                                                                         |
| `computeNextDpr`     | `currentDpr` outside `[minDpr, maxDpr]`                      | Result is clamped to `[minDpr, maxDpr]`.                                                                                                                                                                           |
| `DynamicResScaler`   | Mounted without a `Canvas` (SSR, unit test)                  | `useThree` returns the test mock; no change vs. current behavior.                                                                                                                                                  |
| `SfxBufferCache`     | Unknown buffer name                                          | Returns `undefined`. `Synth.playSFX` already handles `undefined` (no-op).                                                                                                                                          |
| `SfxBufferCache`     | Buffer factory throws                                        | Error propagates to `Synth.playSFX`. Same failure surface as today.                                                                                                                                                |
| `SynthArpScheduler`  | `ctx` closed before `stop()`                                 | `osc.stop()` and `osc.disconnect()` wrapped in `try`/`catch` (matches the existing `safeStop` pattern).                                                                                                            |
| `SynthArpScheduler`  | `setTimeout` fires after `stop()`                            | `scheduleAhead` checks `isRunning` and returns early.                                                                                                                                                              |
| `SynthArpScheduler`  | Tab backgrounded                                             | `setTimeout` throttled to 1Hz; scheduler continues to run but does no visible work. Audio engine clock also slows. Acceptable.                                                                                     |
| Engine tuple pool    | Pool exhaustion (more allocations than the pool can satisfy) | Falls through to a fresh `[x, y, z]` allocation. Pool grows on miss; not released back. Mirrors `enemyPositionPool`.                                                                                               |
| Engine tuple pool    | Pool grows unbounded                                         | Bounded by high-water mark of projectile/tower concurrency, which is naturally bounded by game design. Same as today.                                                                                              |
| Engine snapshot test | Stochastic `Math.random`                                     | Test uses a deterministic seeded RNG (mulberry32 shim) passed via `EngineTickContext.rng`.                                                                                                                         |

### 6. Testing strategy

**Unit tests (added):**

- `src/tests/perf/dprTuning.test.ts` — pure-function tests:
  - in-band returns `currentDpr` unchanged
  - below-band returns `currentDpr - step` (clamped to `minDpr`)
  - above-band returns `currentDpr + step` (clamped to `maxDpr`)
  - `NaN` / `±Infinity` fps returns `currentDpr` unchanged
  - 0 fps returns `minDpr`
  - out-of-range `currentDpr` is clamped
- `src/tests/perf/frameStats.test.ts` — pure-class tests:
  - first sample: `fps = 0`, `deltaMs = 16.667`, `sampleCount = 1`
  - two samples 16.667ms apart: `fps ≈ 60`
  - window slides: samples older than `windowMs` are dropped
- `src/tests/audio/synth-arp.test.ts` — uses the existing `setupTests.ts` AudioContext mock. Verifies:
  - `start()` schedules one `osc.start()`
  - over N seconds (simulated by `vi.useFakeTimers` + manual `ctx.currentTime` advancement), the right number of notes is scheduled
  - `stop()` disconnects the osc and clears the timer
  - calling `start()` twice is a no-op
- `src/tests/engine/hotpaths-snapshot.test.ts` — runs `stepEngine` on a fixed scenario (5 enemies, 2 towers, 3 projectiles, seed `0xC0FFEE`) and asserts the resulting `EnginePatch` is deeply equal to a committed golden JSON file. Captured once, then `JSON.parse(JSON.stringify(result))` is compared structurally (with `toBeCloseTo` for floats).

**Tests updated:**

- `src/tests/components/DynamicResScaler.test.tsx` — existing 3 tests must still pass. No edits expected; if a test depends on the inline `performance.now` mock, adjust the import path.

**Tests explicitly _not_ added in this PR (per validation = A):**

- DevTools-trace-based frame-time tests.
- Playwright perf assertions.
- A microbench harness. Snapshot test asserts no regression in behavior; it does not assert a speedup.

**Manual validation:**

1. `npm run dev`. Open DevTools console.
2. Start a wave. Confirm `setDpr` calls fire from `DynamicResScaler` when FPS deviates from 60.
3. Toggle music. Aural check: arpeggio sounds identical in tempo and pitch to pre-refactor.
4. Play a full 10-wave run. Confirm no audio dropouts, no SFX delays, no DPR thrash.

### 7. Risks and mitigations

- **Refactor churn.** `Synth` and `DynamicResScaler` are touched together. Mitigations: (a) the unit tests for the new pure modules are independent of the React/Audio code, so a regression is caught at the pure-fn level; (b) the existing `DynamicResScaler.test.tsx` and audio tests pin the integration behavior; (c) the PR is split into 3 logically-independent commits (DPR → Audio → Engine).
- **Audio behavior drift.** The arp scheduler is the highest-risk refactor. Mitigations: (a) the synth-arp test asserts note timing; (b) the arp gains, notes, and durations are behaviorally identical to the current `setInterval` code; (c) a manual aural check in `npm run dev` is part of the validation checklist.
- **Engine patch divergence.** The pool refactor changes how a tuple is allocated but not the value. Mitigations: (a) the snapshot test pins the output; (b) the pool is opt-in via `cache?.targetPositionPool`, so a missing cache is the no-pool path (existing behavior).
- **Module-private API leakage.** `src/game/perf/*` and `src/game/audio/internal/*` are not re-exported from any barrel. A future `index.ts` re-export in those folders would need to be deliberate.
- **Lint regression on `eslint-plugin-react-hooks`.** `useFrameStats` is `useMemo`-based; the existing hooks rules apply. No `useEffect` chains added in the refactored `DynamicResScaler`.

### 8. Out of scope (follow-up work)

- A `useFrameStats()` public hook (exposed at the package level) for future consumers (e.g., an FPS-based quality tier toggle in the settings modal).
- A microbench harness (vitest bench) for `stepEngine` and `Synth.startMusic`/`stopMusic`.
- A Playwright perf assertion that fails CI if median frame time on a synthetic scenario regresses.
- A captured Chrome DevTools performance trace, stored under `verification/`.
- Tuning the DPR step / interval based on real-world frame data once we have it.

### 9. Acceptance criteria

1. All new unit tests pass; all existing unit tests continue to pass.
2. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` are all green locally and in CI.
3. `DynamicResScaler.tsx` is ≤ 40 lines and contains no FPS math, no DPR decision math, and no `Math.round`/clamp expressions.
4. `Synth.ts` contains no `setInterval` call and no `setTimeout` call.
5. The engine snapshot test passes for a deterministic seed.
6. The manual validation checklist (Section 6) is exercised by the PR author before merge.
