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
