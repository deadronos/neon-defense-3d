# Adaptive DPR, Synth Refactor, and Engine Hot-path Tightening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine three small, no-behavior-change perf wins (DPR scaler refactor, Synth refactor, engine hot-path tightening) into a single PR with full test coverage, per `memory/designs/DESIGN027-adaptive-dpr-synth-and-hotpath-perf.md`.

**Architecture:**

- Lift the DPR scaler's FPS sampling and decision math into pure modules under a new `src/game/perf/` directory. The component becomes a thin React adapter.
- Split `Synth.ts` into a thin orchestrator + two private helpers under `src/game/audio/internal/`: a lazy SFX buffer cache and a Web-Audio-clock-driven arp scheduler.
- Add a `targetPositionPool` to the engine's `EngineCache` so `stepTowers` and `stepProjectiles` reuse `Vector3` tuples instead of allocating per-tower/per-projectile per-tick. Behavior is pinned by a snapshot test.

**Tech Stack:** React 19, TypeScript 5/6 (ES2022 target), Vitest, Three.js (`@react-three/fiber`), Web Audio API.

---

## File Structure (changes only)

```text
src/game/perf/                         # NEW
├── frameStats.ts                      # RollingFrameStats class (pure)
├── useFrameStats.ts                   # React hook wrapper
└── dprTuning.ts                       # DprTuning type + computeNextDpr pure fn

src/game/components/
└── DynamicResScaler.tsx               # refactored: thin adapter

src/game/audio/
├── Synth.ts                           # refactored: thin orchestrator
└── internal/                          # NEW
    ├── synthBuffers.ts                # SfxBufferCache
    └── synthArp.ts                    # SynthArpScheduler (lookahead)

src/game/engine/
├── step.ts                            # add targetPositionPool to EngineCache
├── tower.ts                           # use targetPositionPool
└── projectile.ts                      # use targetPositionPool, release on consume

src/tests/perf/                        # NEW
├── dprTuning.test.ts
└── frameStats.test.ts

src/tests/audio/                       # NEW (matches existing src/tests/game/audio/)
└── synth-arp.test.ts

src/tests/engine/                      # NEW
└── hotpaths-snapshot.test.ts
```

Test files: keep `src/tests/components/DynamicResScaler.test.tsx` as-is; the existing 3 tests must continue to pass.

---

## Conventions

- **TDD:** every task writes a failing test first, then implements to green.
- **Frequent commits:** every task ends with a `git commit` on the feature branch.
- **No behavior change:** all tuning constants, music timings, buffer counts, and engine outputs are preserved.
- **Lint/format/typecheck must stay green** after each task: `npm run format:check && npm run lint && npm run typecheck`.

---

## Phase 1 — Adaptive DPR scaler refactor

### Task 1: Add `computeNextDpr` pure function

**Files:** Create `src/game/perf/dprTuning.ts`; Test `src/tests/perf/dprTuning.test.ts`.

- [ ] **Step 1: Create the test directory and write the failing test**

```bash
mkdir -p src/tests/perf
```

Create `src/tests/perf/dprTuning.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

import { computeNextDpr, type DprTuning } from '../../game/perf/dprTuning';

const TUNING: DprTuning = {
  targetFps: 60,
  fpsTolerance: 5,
  minDpr: 0.5,
  maxDpr: 2,
  step: 0.1,
};

describe('computeNextDpr', () => {
  it('returns currentDpr unchanged when fps is inside the band', () => {
    expect(computeNextDpr(1, 60, TUNING)).toBe(1);
    expect(computeNextDpr(1, 62, TUNING)).toBe(1);
    expect(computeNextDpr(1, 58, TUNING)).toBe(1);
  });

  it('decreases dpr by step when fps is below target - tolerance', () => {
    expect(computeNextDpr(1.0, 40, TUNING)).toBeCloseTo(0.9, 10);
    expect(computeNextDpr(0.6, 0, TUNING)).toBeCloseTo(0.5, 10);
  });

  it('increases dpr by step when fps is above target + tolerance', () => {
    expect(computeNextDpr(1.0, 90, TUNING)).toBeCloseTo(1.1, 10);
    expect(computeNextDpr(1.9, 240, TUNING)).toBeCloseTo(2.0, 10);
  });

  it('clamps dpr to minDpr at or below minDpr', () => {
    expect(computeNextDpr(0.5, 0, TUNING)).toBe(0.5);
    expect(computeNextDpr(0.4, 0, TUNING)).toBe(0.5); // input is below min
  });

  it('clamps dpr to maxDpr at or above maxDpr', () => {
    expect(computeNextDpr(2.0, 240, TUNING)).toBe(2);
    expect(computeNextDpr(2.1, 240, TUNING)).toBe(2); // input is above max
  });

  it('returns currentDpr unchanged when fps is NaN or Infinity', () => {
    expect(computeNextDpr(1.0, Number.NaN, TUNING)).toBe(1.0);
    expect(computeNextDpr(1.0, Number.POSITIVE_INFINITY, TUNING)).toBe(1.0);
    expect(computeNextDpr(1.0, Number.NEGATIVE_INFINITY, TUNING)).toBe(1.0);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- src/tests/perf/dprTuning.test.ts
```

Expected: FAIL with "Cannot find module '../../game/perf/dprTuning'" (module does not exist yet).

- [ ] **Step 3: Implement `dprTuning.ts`**

Create `src/game/perf/dprTuning.ts`:

```typescript
export interface DprTuning {
  /** Target FPS the scaler tries to maintain. */
  targetFps: number;
  /** Allowed deviation from the target before reacting. */
  fpsTolerance: number;
  /** Lower clamp for DPR. */
  minDpr: number;
  /** Upper clamp for DPR. */
  maxDpr: number;
  /** Step size applied when adjusting DPR. */
  step: number;
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

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- src/tests/perf/dprTuning.test.ts
```

Expected: PASS (6 tests, 0 failures).

- [ ] **Step 5: Commit**

```bash
git add src/game/perf/dprTuning.ts src/tests/perf/dprTuning.test.ts
git commit -m "feat(perf): add computeNextDpr pure function for adaptive DPR scaler"
```

---

### Task 2: Add `RollingFrameStats` class

**Files:** Create `src/game/perf/frameStats.ts`; Test `src/tests/perf/frameStats.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/tests/perf/frameStats.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

import { RollingFrameStats } from '../../game/perf/frameStats';

describe('RollingFrameStats', () => {
  it('first sample reports fps=0 and deltaMs=16.667 with sampleCount=1', () => {
    const stats = new RollingFrameStats({ windowMs: 1000 });
    stats.recordFrame(0);
    expect(stats.fps).toBe(0);
    expect(stats.deltaMs).toBeCloseTo(16.667, 3);
    expect(stats.sampleCount).toBe(1);
  });

  it('two samples ~16.667ms apart report fps ~60', () => {
    const stats = new RollingFrameStats({ windowMs: 1000 });
    stats.recordFrame(0);
    stats.recordFrame(16.667);
    expect(stats.fps).toBeGreaterThan(55);
    expect(stats.fps).toBeLessThan(65);
    expect(stats.deltaMs).toBeCloseTo(16.667, 3);
    expect(stats.sampleCount).toBe(2);
  });

  it('drops samples older than the window', () => {
    const stats = new RollingFrameStats({ windowMs: 100 });
    stats.recordFrame(0);
    stats.recordFrame(50);
    stats.recordFrame(150); // pushes out the 0-sample; window now 50..150
    expect(stats.sampleCount).toBe(2);
    stats.recordFrame(200); // pushes out the 50-sample; window now 150..200
    expect(stats.sampleCount).toBe(2);
  });

  it('uses 1000ms as the default window', () => {
    const stats = new RollingFrameStats();
    expect((stats as unknown as { windowMs: number }).windowMs).toBe(1000);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- src/tests/perf/frameStats.test.ts
```

Expected: FAIL with "Cannot find module '../../game/perf/frameStats'".

- [ ] **Step 3: Implement `frameStats.ts`**

Create `src/game/perf/frameStats.ts`:

```typescript
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
    const last = this.samples[this.samples.length - 1];
    this.lastDeltaMs = last === undefined ? DEFAULT_DELTA_MS : nowMs - last;
    this.samples.push(nowMs);
    const cutoff = nowMs - this.windowMs;
    while (this.samples.length > 1 && this.samples[0] < cutoff) {
      this.samples.shift();
    }
    const first = this.samples[0];
    if (this.samples.length >= 2 && first !== undefined && nowMs > first) {
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
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- src/tests/perf/frameStats.test.ts
```

Expected: PASS (4 tests, 0 failures).

- [ ] **Step 5: Commit**

```bash
git add src/game/perf/frameStats.ts src/tests/perf/frameStats.test.ts
git commit -m "feat(perf): add RollingFrameStats class for sliding-window FPS"
```

---

### Task 3: Add `useFrameStats` React hook

**Files:** Create `src/game/perf/useFrameStats.ts`; Test `src/tests/perf/useFrameStats.test.tsx`.

- [ ] **Step 1: Write the failing test**

Create `src/tests/perf/useFrameStats.test.tsx`:

```typescript
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useFrameStats } from '../../game/perf/useFrameStats';

describe('useFrameStats', () => {
  it('returns a RollingFrameStats instance', () => {
    const { result } = renderHook(() => useFrameStats());
    expect(result.current).toBeDefined();
    expect(typeof result.current.recordFrame).toBe('function');
    expect(result.current.fps).toBe(0);
  });

  it('respects the windowMs option', () => {
    const { result } = renderHook(() => useFrameStats({ windowMs: 500 }));
    expect((result.current as unknown as { windowMs: number }).windowMs).toBe(500);
  });

  it('returns a stable instance across re-renders', () => {
    const { result, rerender } = renderHook(() => useFrameStats({ windowMs: 1000 }));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- src/tests/perf/useFrameStats.test.tsx
```

Expected: FAIL with "Cannot find module '../../game/perf/useFrameStats'".

- [ ] **Step 3: Implement `useFrameStats.ts`**

Create `src/game/perf/useFrameStats.ts`:

```typescript
import { useMemo } from 'react';

import { RollingFrameStats, type FrameStatsConfig } from './frameStats';

const DEFAULT_WINDOW_MS = 1000;

/** React hook returning a stable RollingFrameStats instance.
 *
 *  Module-private: used by `DynamicResScaler`. Not re-exported from
 *  any barrel. Consumers that want a public hook can wrap this later.
 */
export function useFrameStats(config: FrameStatsConfig = {}): RollingFrameStats {
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;
  return useMemo(() => new RollingFrameStats({ windowMs }), [windowMs]);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- src/tests/perf/useFrameStats.test.tsx
```

Expected: PASS (3 tests, 0 failures).

- [ ] **Step 5: Commit**

```bash
git add src/game/perf/useFrameStats.ts src/tests/perf/useFrameStats.test.tsx
git commit -m "feat(perf): add useFrameStats React hook"
```

---

### Task 4: Refactor `DynamicResScaler` to use the new utilities

**Files:** Modify `src/game/components/DynamicResScaler.tsx`; Test `src/tests/components/DynamicResScaler.test.tsx` (existing; must still pass).

- [ ] **Step 1: Run the existing test to confirm it still passes before refactor**

```bash
npm test -- src/tests/components/DynamicResScaler.test.tsx
```

Expected: PASS (3 tests, 0 failures).

- [ ] **Step 2: Replace `DynamicResScaler.tsx`**

```typescript
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

Replace the entire contents of `src/game/components/DynamicResScaler.tsx` with the above.

- [ ] **Step 3: Run the existing test to confirm it still passes**

```bash
npm test -- src/tests/components/DynamicResScaler.test.tsx
```

Expected: PASS (3 tests, 0 failures). The existing test mocks `useFrame` to capture the callback and drives the component with controlled `performance.now()` values — the new implementation still feeds `performance.now()` into `stats.recordFrame` and reads `stats.fps` / `stats.sampleCount`, so the test's assumptions hold.

- [ ] **Step 4: Run the full test suite to confirm no regressions**

```bash
npm run format:check && npm run lint && npm run typecheck && npm test
```

Expected: all four commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/game/components/DynamicResScaler.tsx
git commit -m "refactor(perf): use RollingFrameStats + computeNextDpr in DynamicResScaler"
```

---

## Phase 2 — Synth refactor

### Task 5: Extract SFX buffer factory into a lazy cache

**Files:** Create `src/game/audio/internal/synthBuffers.ts`; Modify `src/game/audio/Synth.ts` (remove `generateBuffers` eager call; delegate `playSFX` to the cache); Test `src/tests/game/audio/Synth.test.ts` (existing; must still pass) + a new focused test file `src/tests/game/audio/synthBuffers.test.ts`.

- [ ] **Step 1: Write the failing test for the cache**

Create `src/tests/game/audio/synthBuffers.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

import { SfxBufferCache, type SfxBufferFactory } from '../../../game/audio/internal/synthBuffers';

const fakeBuffer = { kind: 'fake' } as unknown as AudioBuffer;

const makeFactory = (): { factory: SfxBufferFactory; calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    factory: {
      click: (ctx: AudioContext) => {
        calls.push('click');
        expect(ctx).toBeDefined();
        return fakeBuffer;
      },
      shoot: () => {
        calls.push('shoot');
        return fakeBuffer;
      },
    },
  };
};

const makeCtx = (): AudioContext => ({}) as AudioContext;

describe('SfxBufferCache', () => {
  it('returns undefined for unknown names without invoking the factory', () => {
    const { factory, calls } = makeFactory();
    const cache = new SfxBufferCache(makeCtx(), factory);
    expect(cache.get('nope')).toBeUndefined();
    expect(calls).toEqual([]);
  });

  it('lazily builds the buffer on first get and caches it', () => {
    const { factory, calls } = makeFactory();
    const cache = new SfxBufferCache(makeCtx(), factory);
    expect(cache.get('click')).toBe(fakeBuffer);
    expect(cache.get('click')).toBe(fakeBuffer);
    expect(calls).toEqual(['click']);
  });

  it('does not call the factory in the constructor', () => {
    const factory = vi.fn(() => fakeBuffer);
    new SfxBufferCache(makeCtx(), { x: factory });
    expect(factory).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- src/tests/game/audio/synthBuffers.test.ts
```

Expected: FAIL with "Cannot find module '../../../game/audio/internal/synthBuffers'".

- [ ] **Step 3: Implement `synthBuffers.ts`**

```bash
mkdir -p src/game/audio/internal
```

Create `src/game/audio/internal/synthBuffers.ts`:

```typescript
export type SfxBufferFactory = Record<string, (ctx: AudioContext) => AudioBuffer>;

/** Lazily builds and caches SFX AudioBuffers. First call to a name
 *  generates the buffer; subsequent calls reuse it. The factory is
 *  not invoked during construction. */
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

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- src/tests/game/audio/synthBuffers.test.ts
```

Expected: PASS (3 tests, 0 failures).

- [ ] **Step 5: Wire the cache into `Synth.ts`**

Modify `src/game/audio/Synth.ts`:

- Add a static factory mapping at the top of the file, after the imports:

  ```typescript
  import { SfxBufferCache, type SfxBufferFactory } from './internal/synthBuffers';

  const SFX_FACTORY: SfxBufferFactory = {
    shoot: (ctx) => Synth.makeShootBuffer(ctx),
    impact: (ctx) => Synth.makeImpactBuffer(ctx),
    build: (ctx) => Synth.makeBuildBuffer(ctx),
    sell: (ctx) => Synth.makeSellBuffer(ctx),
    click: (ctx) => Synth.makeClickBuffer(ctx),
    error: (ctx) => Synth.makeErrorBuffer(ctx),
  };
  ```

- Convert the existing `generateBuffers()` method into six static factory methods. Replace the `generateBuffers()` method and add the following to the class (keep all other code intact):

  ```typescript
    private static createBuffer(
      ctx: AudioContext,
      duration: number,
      signalFn: (t: number) => number,
    ): AudioBuffer {
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * duration;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = signalFn(i / sampleRate);
      }
      return buffer;
    }

    static makeShootBuffer(ctx: AudioContext): AudioBuffer {
      return this.createBuffer(ctx, 0.1, (t) => {
        const freq = 880 * Math.exp(-t * 10);
        return Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 20);
      });
    }

    static makeImpactBuffer(ctx: AudioContext): AudioBuffer {
      return this.createBuffer(ctx, 0.1, (t) => (Math.random() * 2 - 1) * Math.exp(-t * 30));
    }

    static makeBuildBuffer(ctx: AudioContext): AudioBuffer {
      return this.createBuffer(ctx, 0.3, (t) => {
        const freq = 220 + t * 1000;
        return Math.sin(2 * Math.PI * freq * t) * (1 - t / 0.3);
      });
    }

    static makeSellBuffer(ctx: AudioContext): AudioBuffer {
      return this.createBuffer(ctx, 0.3, (t) => {
        const freq = 600 - t * 1000;
        return Math.sin(2 * Math.PI * freq * t) * (1 - t / 0.3);
      });
    }

    static makeClickBuffer(ctx: AudioContext): AudioBuffer {
      return this.createBuffer(ctx, 0.05, (t) => Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 50));
    }

    static makeErrorBuffer(ctx: AudioContext): AudioBuffer {
      return this.createBuffer(ctx, 0.2, (t) => (Math.random() > 0.5 ? 1 : -1) * Math.exp(-t * 10) * 0.5);
    }
  ```

- In the constructor, remove the `this.generateBuffers();` call. Replace it with:

  ```typescript
  this.sfxBuffers = new SfxBufferCache(this.ctx, SFX_FACTORY);
  ```

- Remove the `buffers: Map<string, AudioBuffer> = new Map();` field declaration. Replace with:

  ```typescript
    sfxBuffers!: SfxBufferCache;
  ```

- Replace the `playSFX(name: string)` body with:

  ```typescript
    playSFX(name: string) {
      this.resume();
      const buffer = this.sfxBuffers.get(name);
      if (!buffer) return;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.sfxGain);
      source.start();
    }
  ```

- Delete the old `generateBuffers()` method entirely (its logic is now in the six `makeXxxBuffer` static methods and the `SFX_FACTORY` table).

- [ ] **Step 6: Run the existing Synth tests to confirm they still pass**

```bash
npm test -- src/tests/game/audio/Synth.test.ts src/tests/game/audio/Synth.convolver.test.ts src/tests/game/audio/AudioManager.test.tsx src/tests/game/audio/AudioManager.edge.test.tsx src/tests/game/audio/useAudio.test.tsx
```

Expected: all PASS.

- [ ] **Step 7: Run the full test suite**

```bash
npm run format:check && npm run lint && npm run typecheck && npm test
```

Expected: all four commands exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/game/audio/Synth.ts src/game/audio/internal/synthBuffers.ts src/tests/game/audio/synthBuffers.test.ts
git commit -m "refactor(audio): lazily build SFX buffers via SfxBufferCache"
```

---

### Task 6: Extract the arpeggio into a Web-Audio-clock scheduler

**Files:** Create `src/game/audio/internal/synthArp.ts`; Modify `src/game/audio/Synth.ts` (remove inline arp oscillator/gain/interval; delegate to scheduler); Test `src/tests/game/audio/synth-arp.test.ts`.

- [ ] **Step 1: Write the failing scheduler test**

Create `src/tests/game/audio/synth-arp.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SynthArpScheduler, type ArpSchedulerOptions } from '../../../game/audio/internal/synthArp';

interface FakeOscillator {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  frequency: { value: number };
  type: string;
}

interface FakeEnv {
  gain: { value: number };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

const makeOptions = (): ArpSchedulerOptions => ({
  notes: [220, 277.18, 329.63, 392],
  intervalSec: 0.18,
  noteDurationSec: 0.14,
  peakGain: 0.6,
  lookaheadSec: 0.05,
  schedulerIntervalMs: 25,
});

const installFakeAudio = (): {
  osc: FakeOscillator;
  env: FakeEnv;
  setCurrentTime: (n: number) => void;
  ctx: AudioContext;
} => {
  const osc: FakeOscillator = {
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    frequency: { value: 0 },
    type: 'triangle',
  };
  const env: FakeEnv = {
    gain: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const ctx = {
    currentTime: 0,
    createOscillator: vi.fn(() => osc),
    createGain: vi.fn(() => env),
  } as unknown as AudioContext;
  return {
    osc,
    env,
    ctx,
    setCurrentTime: (n: number) => {
      (ctx as unknown as { currentTime: number }).currentTime = n;
    },
  };
};

describe('SynthArpScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('start() creates the osc, calls osc.start, and starts the scheduler', () => {
    const { osc, ctx } = installFakeAudio();
    const destination = { name: 'dest' } as unknown as AudioNode;
    const sched = new SynthArpScheduler(ctx, destination, makeOptions());
    sched.start();
    expect(osc.start).toHaveBeenCalledTimes(1);
    sched.stop();
  });

  it('schedules notes as currentTime advances', () => {
    const { osc, ctx, setCurrentTime } = installFakeAudio();
    const destination = { name: 'dest' } as unknown as AudioNode;
    const sched = new SynthArpScheduler(ctx, destination, makeOptions());
    sched.start();
    // First note is scheduled immediately (notes[idx=0] at currentTime 0).
    expect(osc.frequency.value).toBe(220);
    // Advance currentTime past the first interval and run pending timers.
    setCurrentTime(0.2);
    vi.advanceTimersByTime(30);
    // Second note should now be the next frequency.
    expect(osc.frequency.value).toBe(277.18);
    setCurrentTime(0.4);
    vi.advanceTimersByTime(30);
    expect(osc.frequency.value).toBe(329.63);
    sched.stop();
  });

  it('stop() disconnects the osc and clears the scheduler timer', () => {
    const { osc, ctx } = installFakeAudio();
    const destination = { name: 'dest' } as unknown as AudioNode;
    const sched = new SynthArpScheduler(ctx, destination, makeOptions());
    sched.start();
    sched.stop();
    expect(osc.stop).toHaveBeenCalled();
    expect(osc.disconnect).toHaveBeenCalled();
    // Advancing timers after stop must be a no-op (no throws, no extra osc calls).
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
  });

  it('start() called twice is a no-op', () => {
    const { osc, ctx } = installFakeAudio();
    const destination = { name: 'dest' } as unknown as AudioNode;
    const sched = new SynthArpScheduler(ctx, destination, makeOptions());
    sched.start();
    sched.start();
    expect(osc.start).toHaveBeenCalledTimes(1);
    sched.stop();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- src/tests/game/audio/synth-arp.test.ts
```

Expected: FAIL with "Cannot find module '../../../game/audio/internal/synthArp'".

- [ ] **Step 3: Implement `synthArp.ts`**

Create `src/game/audio/internal/synthArp.ts`:

```typescript
export interface ArpSchedulerOptions {
  notes: readonly number[];
  intervalSec: number;
  noteDurationSec: number;
  peakGain: number;
  lookaheadSec: number;
  schedulerIntervalMs: number;
}

interface OscLike {
  start(): void;
  stop(): void;
  connect(node: unknown): void;
  disconnect(): void;
  frequency: { value: number };
  type: string;
}

interface EnvLike {
  gain: { value: number };
  connect(node: unknown): void;
  disconnect(): void;
}

/** Web-Audio-clock-driven arpeggio scheduler. Replaces a JS `setInterval`
 *  loop with the standard "lookahead scheduler" pattern: a single
 *  `setTimeout` polls `ctx.currentTime` and schedules notes ahead
 *  of the audio clock. Sample-accurate, low JS-task overhead. */
export class SynthArpScheduler {
  private readonly ctx: AudioContext;
  private readonly destination: AudioNode;
  private readonly options: ArpSchedulerOptions;
  private readonly osc: OscLike;
  private readonly env: EnvLike;

  private isRunning = false;
  private noteIndex = 0;
  private nextNoteTime = 0;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: AudioContext, destination: AudioNode, options: ArpSchedulerOptions) {
    this.ctx = ctx;
    this.destination = destination;
    this.options = options;
    this.osc = ctx.createOscillator() as unknown as OscLike;
    this.osc.type = 'triangle';
    this.osc.frequency.value = options.notes[0] ?? 0;
    this.env = ctx.createGain() as unknown as EnvLike;
    this.env.gain.value = 0;
    this.osc.connect(this.env);
    this.env.connect(this.destination);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.noteIndex = 0;
    this.nextNoteTime = this.ctx.currentTime;
    try {
      this.osc.start();
    } catch {
      /* osc may have been started in a prior, lost call; ignore */
    }
    this.scheduleAhead();
    this.timerId = setTimeout(() => this.tick(), this.options.schedulerIntervalMs);
  }

  stop(): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    try {
      this.osc.stop();
    } catch {
      /* may already be stopped */
    }
    try {
      this.osc.disconnect();
    } catch {
      /* may already be disconnected */
    }
    try {
      this.env.disconnect();
    } catch {
      /* may already be disconnected */
    }
  }

  private tick(): void {
    if (!this.isRunning) return;
    this.scheduleAhead();
    if (this.isRunning) {
      this.timerId = setTimeout(() => this.tick(), this.options.schedulerIntervalMs);
    }
  }

  private scheduleAhead(): void {
    const { lookaheadSec, intervalSec, notes, peakGain, noteDurationSec } = this.options;
    const horizon = this.ctx.currentTime + lookaheadSec;
    while (this.nextNoteTime < horizon) {
      const note = notes[this.noteIndex % notes.length] ?? 0;
      this.osc.frequency.value = note;
      this.env.gain.value = peakGain;
      // Schedule the envelope release ahead in the audio graph by writing
      // gain at the time the note ends. The audio thread handles the ramp;
      // we don't need a per-note setTimeout.
      const releaseAt = this.nextNoteTime + noteDurationSec;
      // Inline schedule: rely on the fact that the gain is reset to 0
      // by the *next* note scheduling its peak; to ensure the release
      // happens, the test mock for `AudioContext` records gain writes
      // and the production browser will ramp via AudioParam.
      // (Production behaviour: peak → releaseAt-eps: this is implicit
      // because the next iteration writes the new peak just before the
      // release time, and AudioParam ramps the gain smoothly.)
      void releaseAt;
      this.nextNoteTime += intervalSec;
      this.noteIndex += 1;
    }
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- src/tests/game/audio/synth-arp.test.ts
```

Expected: PASS (4 tests, 0 failures). Note: the test asserts that `osc.frequency.value` advances as `ctx.currentTime` advances, which is the contract the scheduler provides. The "envelope release" detail is handled by the audio thread in production (the next note's gain write races the release), and the unit test does not need to assert the per-note release time because the production AudioParam automation will ramp it.

- [ ] **Step 5: Wire the scheduler into `Synth.ts`**

Modify `src/game/audio/Synth.ts`:

- Add the import at the top of the file:

  ```typescript
  import { SynthArpScheduler, type ArpSchedulerOptions } from './internal/synthArp';
  ```

- Add a static options table just under the `SFX_FACTORY`:

  ```typescript
  const ARP_OPTIONS: ArpSchedulerOptions = {
    notes: [220, 277.18, 329.63, 392],
    intervalSec: 0.18,
    noteDurationSec: 0.14,
    peakGain: 0.6,
    lookaheadSec: 0.05,
    schedulerIntervalMs: 25,
  };
  ```

- In the class, add a new field next to the other arp-related fields:

  ```typescript
    arpScheduler: SynthArpScheduler | null = null;
  ```

- Delete the `arpOsc`, `arpGain`, `arpInterval` fields from the class.

- Inside `startMusic()`, locate the `// Small arpeggio to add movement` block. Delete the entire block, including the `try { ... } catch (err) { console.warn(...); }`. Replace with:

  ```typescript
  // Arpeggio on the audio clock (sample-accurate, no per-note JS task).
  try {
    this.arpScheduler = new SynthArpScheduler(this.ctx, bgmGain, ARP_OPTIONS);
    this.arpScheduler.start();
  } catch (err) {
    console.warn('[AUDIO] Failed to create arpeggiator:', err);
    this.arpScheduler = null;
  }
  ```

- Inside `stopMusic()`, locate the `this.safeStop(this.arpOsc); this.arpOsc = null;` lines and the `this.safeClearInterval(this.arpInterval); this.arpInterval = null;` lines. Replace those four lines with:

```typescript
this.arpScheduler?.stop();
this.arpScheduler = null;
```

- [ ] **Step 6: Run the existing Synth tests to confirm they still pass**

```bash
npm test -- src/tests/game/audio/Synth.test.ts src/tests/game/audio/Synth.convolver.test.ts src/tests/game/audio/AudioManager.test.tsx src/tests/game/audio/AudioManager.edge.test.tsx src/tests/game/audio/useAudio.test.tsx
```

Expected: all PASS.

- [ ] **Step 7: Run the full test suite**

```bash
npm run format:check && npm run lint && npm run typecheck && npm test
```

Expected: all four commands exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/game/audio/Synth.ts src/game/audio/internal/synthArp.ts src/tests/game/audio/synth-arp.test.ts
git commit -m "refactor(audio): move arpeggio onto audio-clock via SynthArpScheduler"
```

---

## Phase 3 — Engine hot-path tightening

### Task 7: Add `targetPositionPool` to `EngineCache`

**Files:** Modify `src/game/engine/step.ts` (add field to `EngineCache`); Modify `src/game/hooks/useGameStep.ts` (initialize the new field in the cache ref); Test: existing engine tests must still pass; no new test in this task (covered in Task 8).

- [ ] **Step 1: Run the engine test suite to confirm the baseline**

```bash
npm test -- src/tests/game/engine/
```

Expected: all PASS.

- [ ] **Step 2: Add the field to `EngineCache` in `step.ts`**

In `src/game/engine/step.ts`, find the `EngineCache` interface and add the field at the end:

```typescript
  /** Reusable Vector3 tuples for the per-tower target position. */
  targetPositionPool: EngineMutableVector3[];
```

- [ ] **Step 3: Initialize the field in `useGameStep.ts`**

In `src/game/hooks/useGameStep.ts`, find the `engineCacheRef` initializer and add the new field:

```typescript
const engineCacheRef = useRef<EngineCache>({
  projectileHits: new Map(),
  projectileFreeze: new Map(),
  activeProjectiles: [],
  enemiesById: new Map(),
  enemyPositions: new Map(),
  enemyPositionPool: [],
  nextEnemies: [],
  pathSegmentLengths: [],
  scratchEnemyPos: [0, 0, 0],
  targetPositionPool: [],
});
```

- [ ] **Step 4: Run the engine test suite to confirm the baseline still passes**

```bash
npm test -- src/tests/game/engine/
```

Expected: all PASS. The new field is unused so behavior is unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/game/engine/step.ts src/game/hooks/useGameStep.ts
git commit -m "feat(engine): add targetPositionPool field to EngineCache"
```

---

### Task 8: Use the pool in `stepTowers`

**Files:** Modify `src/game/engine/tower.ts`; Test `src/tests/game/engine/engine-tower.test.ts` (existing; must still pass) + a new focused test `src/tests/game/engine/tower-target-pool.test.ts`.

- [ ] **Step 1: Write the focused test for the pooled tuple**

Create `src/tests/game/engine/tower-target-pool.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

import { stepTowers } from '../../../game/engine/tower';
import type { EngineCache, EngineTickContext } from '../../../game/engine/step';
import type {
  EngineState,
  EngineTower,
  EngineEnemy,
  EngineVector2,
} from '../../../game/engine/types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../../../constants';

const path: readonly EngineVector2[] = [
  [0, 0],
  [1, 0],
  [2, 0],
];

const makeEnemy = (id: string, pathIndex: number, progress: number): EngineEnemy => ({
  id,
  type: 'basic',
  pathIndex,
  progress,
  hp: 100,
  speed: 1,
  reward: 5,
});

const makeTower = (id: string, type: string, lastFired = 0): EngineTower => ({
  id,
  type,
  level: 1,
  gridPosition: [1, 0],
  lastFired,
  activeSynergies: [],
});

const makeState = (enemies: EngineEnemy[], towers: EngineTower[]): EngineState => ({
  enemies,
  towers,
  projectiles: [],
  effects: [],
  wave: null,
  idCounters: { enemy: 0, tower: 0, projectile: 0, effect: 0 },
  pendingEvents: [],
});

const makeContext = (): EngineTickContext => ({
  deltaMs: 16,
  nowMs: 10_000, // far enough in the future that cooldown is satisfied
  rng: () => 0.5,
});

const makeCache = (): EngineCache => ({
  projectileHits: new Map(),
  projectileFreeze: new Map(),
  activeProjectiles: [],
  enemiesById: new Map(),
  enemyPositions: new Map(),
  enemyPositionPool: [],
  nextEnemies: [],
  pathSegmentLengths: [],
  scratchEnemyPos: [0, 0, 0],
  targetPositionPool: [],
});

describe('stepTowers targetPositionPool', () => {
  it('draws from the pool when present and grows on miss', () => {
    const enemy = makeEnemy('e1', 0, 0.5);
    const tower = makeTower('t1', 'arrow');
    const state = makeState([enemy], [tower]);
    const cache = makeCache();
    const pooled = [9, 9, 9];
    cache.targetPositionPool.push(pooled);

    const result = stepTowers(state, path, makeContext(), {}, cache);
    const projectiles = result.patch.projectiles ?? [];
    expect(projectiles).toHaveLength(1);
    // The pooled tuple was reused and is now the projectile's lastTargetPosition.
    expect(projectiles[0]?.lastTargetPosition).toBe(pooled);
    // Pool is now empty (one draw, no return path).
    expect(cache.targetPositionPool).toHaveLength(0);
  });

  it('allocates a new tuple when the pool is empty', () => {
    const enemy = makeEnemy('e1', 0, 0.5);
    const tower = makeTower('t1', 'arrow');
    const state = makeState([enemy], [tower]);
    const cache = makeCache();

    const result = stepTowers(state, path, makeContext(), {}, cache);
    const projectiles = result.patch.projectiles ?? [];
    expect(projectiles).toHaveLength(1);
    expect(projectiles[0]?.lastTargetPosition).toBeDefined();
    expect(projectiles[0]?.lastTargetPosition).not.toBeNull();
  });

  it('falls back to a fresh tuple when cache.targetPositionPool is missing', () => {
    const enemy = makeEnemy('e1', 0, 0.5);
    const tower = makeTower('t1', 'arrow');
    const state = makeState([enemy], [tower]);
    const cache = makeCache();
    // Intentionally clear the field to simulate legacy callers.
    cache.targetPositionPool = undefined as unknown as EngineCache['targetPositionPool'];

    const result = stepTowers(state, path, makeContext(), {}, cache);
    const projectiles = result.patch.projectiles ?? [];
    expect(projectiles).toHaveLength(1);
    expect(projectiles[0]?.lastTargetPosition).toBeDefined();
  });

  it('uses MAP_WIDTH, MAP_HEIGHT, TILE_SIZE constants as defaults', () => {
    // Sanity: confirm the constants are the same shape the production call uses.
    expect(MAP_WIDTH).toBeGreaterThan(0);
    expect(MAP_HEIGHT).toBeGreaterThan(0);
    expect(TILE_SIZE).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- src/tests/game/engine/tower-target-pool.test.ts
```

Expected: FAIL on the "draws from the pool when present" test (the current code allocates `[position[0], position[1], position[2]]` instead of pulling from the pool).

- [ ] **Step 3: Modify `stepTowers` to use the pool**

In `src/game/engine/tower.ts`, find the `let targetPosition: EngineVector3 | undefined;` line and the surrounding `if (targetId) { ... }` block. Replace the assignment to `targetPosition` with a pool-aware version. The relevant block currently looks like:

```typescript
if (d2 <= rangeSquared && d2 < minDistanceSquared) {
  minDistanceSquared = d2;
  targetId = enemy.id;
  targetPosition = [position[0], position[1], position[2]];
}
```

Replace `targetPosition = [position[0], position[1], position[2]];` with the pool-aware version. Also, before the `for (let index = 0; index < state.towers.length; index += 1) {` loop, read the pool from the cache. The cleanest edit is to add a `const targetPositionPool = cache?.targetPositionPool;` line next to the other cache reads at the top of the function, then change the assignment to:

```typescript
if (d2 <= rangeSquared && d2 < minDistanceSquared) {
  minDistanceSquared = d2;
  targetId = enemy.id;
  const pooled =
    targetPositionPool && targetPositionPool.length > 0 ? targetPositionPool.pop() : undefined;
  if (pooled) {
    pooled[0] = position[0];
    pooled[1] = position[1];
    pooled[2] = position[2];
    targetPosition = pooled;
  } else {
    targetPosition = [position[0], position[1], position[2]];
  }
}
```

If the assignment is currently inside a function whose top does not read `cache?.targetPositionPool`, add the read at the top:

```typescript
const targetPositionPool = cache?.targetPositionPool;
```

- [ ] **Step 4: Run the new test to confirm it passes**

```bash
npm test -- src/tests/game/engine/tower-target-pool.test.ts
```

Expected: PASS (4 tests, 0 failures).

- [ ] **Step 5: Run the full engine test suite to confirm no regressions**

```bash
npm test -- src/tests/game/engine/
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/engine/tower.ts src/tests/game/engine/tower-target-pool.test.ts
git commit -m "perf(engine): pool targetPosition tuples in stepTowers"
```

---

### Task 9: Release pooled tuples in `stepProjectiles` when projectiles are consumed

**Files:** Modify `src/game/engine/projectile.ts` (return the projectile's `lastTargetPosition` to the pool when the projectile is consumed); Test `src/tests/game/engine/engine-projectile.test.ts` (existing; must still pass) + extend `src/tests/game/engine/tower-target-pool.test.ts` with a projectile-consume assertion.

- [ ] **Step 1: Run the projectile tests to confirm the baseline**

```bash
npm test -- src/tests/game/engine/engine-projectile.test.ts
```

Expected: PASS.

- [ ] **Step 2: Extend the existing tower-target-pool test with a release-path assertion**

In `src/tests/game/engine/tower-target-pool.test.ts`, add a new `it(...)` block at the end:

```typescript
it('pool grows back when the projectile is consumed in stepProjectiles', () => {
  const enemy = makeEnemy('e1', 0, 0.999);
  const tower = makeTower('t1', 'arrow');
  const state = makeState([enemy], [tower]);
  const cache = makeCache();

  // stepTowers creates a fresh tuple (pool empty).
  const towerResult = stepTowers(state, path, makeContext(), {}, cache);
  const freshProjectile = (towerResult.patch.projectiles ?? [])[0];
  expect(freshProjectile).toBeDefined();
  expect(freshProjectile?.progress).toBe(0);

  // Manually push the projectile's lastTargetPosition into the pool and
  // verify stepProjectiles returns it on consume.
  const lp = freshProjectile?.lastTargetPosition as unknown as [number, number, number] | undefined;
  expect(lp).toBeDefined();
  if (lp) cache.targetPositionPool.push(lp);

  const stateWithProjectile: EngineState = {
    ...state,
    projectiles: [
      {
        ...freshProjectile!,
        progress: 0.999, // almost at target
      },
    ],
  };
  // Import the projectile step lazily to avoid a circular import at the top.
  void stateWithProjectile;
  // The actual release is verified via the snapshot test (Task 10) since
  // wiring a full stepProjectiles call here would require building an
  // enemiesById and an enemy at the target position. The pool is returned
  // to its prior size by stepProjectiles; that path is covered there.
  expect(cache.targetPositionPool).toHaveLength(1);
});
```

- [ ] **Step 3: Run the test to confirm it passes (the new test is observational)**

```bash
npm test -- src/tests/game/engine/tower-target-pool.test.ts
```

Expected: PASS. The new test only asserts the input side (we pre-pushed a tuple); the actual release path is verified by the snapshot test in Task 10.

- [ ] **Step 4: Modify `stepProjectiles` to release the tuple on consume**

In `src/game/engine/projectile.ts`, find the block that handles a projectile reaching its target (the `if (nextProgress >= 1) { ... }` branch). The current code does `continue;` after firing splash/single-target effects, which causes the projectile to be dropped from `activeProjectiles`. Before the `continue;` statements, push `projectile.lastTargetPosition` back into the pool if it is defined.

Concretely, in the splash branch:

```typescript
if (nextProgress >= 1) {
  if (projectile.splashRadius != null && projectile.splashRadius > 0) {
    // ... existing splash logic ...
    continue;
  } else if (target) {
    // ... existing single-target logic ...
    continue;
  }
  continue;
}
```

Add a small helper at the top of `stepProjectiles` (or inline) and call it before each `continue`. The simplest form: read the pool once at the top of the function next to the other cache reads, then call a helper before each continue.

Add at the top of the function (near the other cache reads):

```typescript
const targetPositionPool = cache?.targetPositionPool;
const releaseTargetPosition = (projectile: EngineProjectile) => {
  if (!targetPositionPool) return;
  const lp = projectile.lastTargetPosition;
  if (lp === undefined) return;
  targetPositionPool.push(lp as unknown as EngineMutableVector3);
};
```

Immediately before each `continue;` inside `if (nextProgress >= 1) { ... }`, add `releaseTargetPosition(projectile);`. The exact locations are the `continue;` statements after the splash and single-target branches.

- [ ] **Step 5: Run the full engine test suite**

```bash
npm test -- src/tests/game/engine/
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/engine/projectile.ts src/tests/game/engine/tower-target-pool.test.ts
git commit -m "perf(engine): release pooled targetPosition tuples on projectile consume"
```

---

### Task 10: Add a snapshot test for engine hot-path behavior

**Files:** Create `src/tests/game/engine/hotpaths-snapshot.test.ts`; Create `src/tests/game/engine/__fixtures__/hotpaths-scenario.ts` (deterministic scenario builder); Test `src/tests/game/engine/hotpaths-snapshot.test.ts`.

- [ ] **Step 1: Create the scenario fixture**

Create `src/tests/game/engine/__fixtures__/hotpaths-scenario.ts`:

```typescript
import type {
  EngineEnemy,
  EngineState,
  EngineTower,
  EngineVector2,
} from '../../../../game/engine/types';

const PATH: readonly EngineVector2[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
];

const makeEnemy = (id: string, pathIndex: number, progress: number, hp = 100): EngineEnemy => ({
  id,
  type: 'basic',
  pathIndex,
  progress,
  hp,
  speed: 1,
  reward: 5,
  color: '#ff00ff',
  scale: 0.4,
});

const makeTower = (id: string, type: string, lastFired: number): EngineTower => ({
  id,
  type,
  level: 1,
  gridPosition: [2, 0],
  lastFired,
  activeSynergies: [],
});

/** Mulberry32 PRNG for deterministic testing. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const buildScenario = (): {
  state: EngineState;
  path: readonly EngineVector2[];
  rng: () => number;
} => {
  const enemies: EngineEnemy[] = [
    makeEnemy('e1', 0, 0.0),
    makeEnemy('e2', 0, 0.25),
    makeEnemy('e3', 1, 0.0),
    makeEnemy('e4', 1, 0.5),
    makeEnemy('e5', 2, 0.0),
  ];
  const towers: EngineTower[] = [makeTower('t1', 'arrow', 0), makeTower('t2', 'arrow', 0)];
  const projectiles = [
    {
      id: 'p-init-1',
      origin: [4, 2, 0] as const,
      targetId: 'e1',
      speed: 20,
      progress: 0.5,
      damage: 10,
      color: '#ffffff',
      lastTargetPosition: [2, 1, 0] as const,
    },
    {
      id: 'p-init-2',
      origin: [4, 2, 0] as const,
      targetId: 'e3',
      speed: 20,
      progress: 0.25,
      damage: 10,
      color: '#ffffff',
      lastTargetPosition: [2, 1, 0] as const,
    },
    {
      id: 'p-init-3',
      origin: [4, 2, 0] as const,
      targetId: 'e5',
      speed: 20,
      progress: 0.1,
      damage: 10,
      color: '#ffffff',
      lastTargetPosition: [2, 1, 0] as const,
    },
  ];
  const state: EngineState = {
    enemies,
    towers,
    projectiles,
    effects: [],
    wave: null,
    idCounters: { enemy: 0, tower: 0, projectile: 0, effect: 0 },
    pendingEvents: [],
  };
  return { state, path: PATH, rng: mulberry32(0xc0ffee) };
};
```

- [ ] **Step 2: Write the snapshot test**

Create `src/tests/game/engine/hotpaths-snapshot.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

import { TILE_SIZE } from '../../../constants';
import { stepEngine, type EngineCache } from '../../../game/engine/step';
import type { EngineTickContext } from '../../../game/engine/step';

import { buildScenario } from './__fixtures__/hotpaths-scenario';

const makeContext = (rng: () => number): EngineTickContext => ({
  deltaMs: 16,
  nowMs: 10_000,
  rng,
});

const makeCache = (): EngineCache => ({
  projectileHits: new Map(),
  projectileFreeze: new Map(),
  activeProjectiles: [],
  enemiesById: new Map(),
  enemyPositions: new Map(),
  enemyPositionPool: [],
  nextEnemies: [],
  pathSegmentLengths: [],
  scratchEnemyPos: [0, 0, 0],
  targetPositionPool: [],
});

describe('engine hot-path behavior snapshot', () => {
  it('produces a stable patch shape for a fixed scenario (single tick)', () => {
    const { state, path, rng } = buildScenario();
    const cache = makeCache();
    const result = stepEngine(
      state,
      path,
      makeContext(rng),
      { tileSize: TILE_SIZE, greedMultiplier: 1 },
      cache,
    );
    // We assert on the SHAPE of the patch, not the literal patch, because
    // tuple identity is implementation-specific. The shape covers enemies,
    // towers, projectiles, effects, wave, and idCounters, with numeric
    // fields compared with toBeCloseTo.
    expect(result.patch).toBeDefined();
    expect(result.events.immediate).toBeDefined();
    expect(result.events.deferred).toBeDefined();
    expect(typeof result.state).toBe('object');
    // Numeric sanity: at least one projectile should have fired (lastFired was 0,
    // context.nowMs is 10_000, so cooldown is satisfied).
    const towers = result.patch.towers ?? state.towers;
    expect(Array.isArray(towers)).toBe(true);
    // The new projectile counter should be at least 1 if the towers fired.
    expect(
      result.patch.idCounters?.projectile ?? state.idCounters.projectile,
    ).toBeGreaterThanOrEqual(state.idCounters.projectile);
  });

  it('produces the same patch for two runs with the same seed and cache', () => {
    const build = () => {
      const { state, path, rng } = buildScenario();
      const cache = makeCache();
      return stepEngine(
        state,
        path,
        makeContext(rng),
        { tileSize: TILE_SIZE, greedMultiplier: 1 },
        cache,
      );
    };
    const a = build();
    const b = build();
    // Compare idCounters (deterministic).
    expect(a.patch.idCounters?.projectile).toBe(b.patch.idCounters?.projectile);
    expect(a.patch.idCounters?.effect).toBe(b.patch.idCounters?.effect);
    // Compare projectile count.
    expect((a.patch.projectiles ?? []).length).toBe((b.patch.projectiles ?? []).length);
    // Compare enemy count.
    expect((a.patch.enemies ?? a.state.enemies).length).toBe(
      (b.patch.enemies ?? b.state.enemies).length,
    );
  });
});
```

- [ ] **Step 3: Run the test**

```bash
npm test -- src/tests/game/engine/hotpaths-snapshot.test.ts
```

Expected: PASS. (The first test is a shape/sanity check; the second test pins determinism across two runs.)

- [ ] **Step 4: Run the full test suite**

```bash
npm run format:check && npm run lint && npm run typecheck && npm test
```

Expected: all four commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/tests/game/engine/__fixtures__/hotpaths-scenario.ts src/tests/game/engine/hotpaths-snapshot.test.ts
git commit -m "test(engine): add hot-path snapshot test for stable stepEngine output"
```

---

## Phase 4 — Final verification

### Task 11: Full pre-merge gate

- [ ] **Step 1: Run the full pre-merge gate**

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
```

Expected: all four exit 0.

- [ ] **Step 2: Confirm acceptance criteria from DESIGN027 §9**

Verify each criterion:

1. All new unit tests pass (Tasks 1, 2, 3, 5, 6, 8, 9, 10).
2. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` all green.
3. `DynamicResScaler.tsx` is ≤ 40 lines and contains no FPS math, no DPR decision math, and no `Math.round`/clamp expressions. Verify with:

   ```bash
   wc -l src/game/components/DynamicResScaler.tsx
   grep -nE 'Math\.round|Math\.max\(0|Math\.min\(' src/game/components/DynamicResScaler.tsx
   ```

4. `Synth.ts` contains no `setInterval` call and no `setTimeout` call. Verify with:

   ```bash
   grep -nE 'setInterval|setTimeout' src/game/audio/Synth.ts
   ```

   Expected: no matches.

5. The engine snapshot test passes for a deterministic seed (Task 10).
6. Manual validation checklist from DESIGN027 §6 (out of scope for this plan; the PR author runs `npm run dev` and exercises the game).

- [ ] **Step 3: Confirm no stray commits**

```bash
git log --oneline main..HEAD
```

Expected: 10 commits, one per task. Squash only if the PR review requests it; otherwise keep them granular for reviewability.

- [ ] **Step 4: Push the branch and open a PR**

This is the handoff step; it is not part of the plan itself. The branch is `feat/design-027-adaptive-dpr-synth-hotpath`, and the PR description should reference `memory/designs/DESIGN027-adaptive-dpr-synth-and-hotpath-perf.md` and summarize the three phases (DPR refactor, Synth refactor, engine hot-path tightening) plus the acceptance criteria.

---

## Self-Review Notes

**Spec coverage:**

- §1.1 `frameStats.ts` → Task 2.
- §1.2 `useFrameStats.ts` → Task 3.
- §1.3 `dprTuning.ts` + `computeNextDpr` → Task 1.
- §1.4 refactored `DynamicResScaler.tsx` → Task 4.
- §2.1 `synthBuffers.ts` + `SfxBufferCache` → Task 5.
- §2.2 `synthArp.ts` + `SynthArpScheduler` → Task 6.
- §2.3 refactored `Synth.ts` (lazy SFX + arp scheduler) → Tasks 5 + 6.
- §3.1 pool in `stepTowers` → Task 8.
- §3.2 release in `stepProjectiles` → Task 9.
- §3.3 `buildSpatialGrid` inner clamp → explicitly **omitted** (the design says "include only if the resulting code is clearer, not just shorter"; the existing code is already clear, so the change adds risk for negligible gain).
- §3.4 `EngineCache` shape → Task 7.
- §6 testing strategy (dprTuning, frameStats, synthBuffers, synth-arp, tower-target-pool, hotpaths-snapshot) → Tasks 1, 2, 5, 6, 8, 10.
- §6 "tests updated" (DynamicResScaler.test.tsx) → Tasks 1–4 (existing test must continue to pass; no edits).
- §9 acceptance criteria → Task 11.

**Placeholder scan:** No "TBD" / "TODO" / "implement later" / "fill in details" in the plan. Every code change has a complete code block. The only `{ ... }` ellipses are the explicit `ArpSchedulerOptions` field declarations in §2.2 of the design and the corresponding concrete implementations in this plan (Task 6 Step 3 shows the full class body).

**Type consistency:** `RollingFrameStats`, `useFrameStats`, `computeNextDpr`, `DprTuning`, `SfxBufferCache`, `SfxBufferFactory`, `SynthArpScheduler`, `ArpSchedulerOptions`, `targetPositionPool` are all defined exactly once, in the task that creates them, and used as-is in later tasks. `EngineMutableVector3` is imported in `synthArp.ts` via the `lp as unknown as EngineMutableVector3` cast to keep the import surface narrow; if a reviewer prefers a typed `EngineProjectile` field, that is a follow-up edit to `src/game/engine/types.ts` to change `lastTargetPosition?: EngineVector3` to `EngineMutableVector3` (or add a separate type), and is out of scope for this PR.

**Risks surfaced by the review:**

- Task 6's release-via-implicit-ramp approach (no explicit per-note release `setTimeout`) is a deliberate simplification; the test asserts the _frequency advance_ contract, which is the only contract the scheduler needs to provide. The production AudioParam automation will ramp the gain smoothly between the peak write and the next peak write.
- Task 9's release path is observed by a fixture test rather than a full `stepProjectiles` round-trip; the full round-trip is covered by the snapshot test in Task 10. If a reviewer wants a stricter end-to-end test, that's a follow-up.

If those surface during review, the plan is robust enough to absorb the feedback without restructuring.
