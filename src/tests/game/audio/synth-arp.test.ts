import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SynthArpScheduler, type ArpSchedulerOptions } from '../../../game/audio/internal/synthArp';

interface FakeOscillator {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  frequency: { value: number; setValueAtTime: ReturnType<typeof vi.fn> };
  type: string;
}

interface FakeEnv {
  gain: {
    value: number;
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
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
    frequency: { value: 0, setValueAtTime: vi.fn() },
    type: 'triangle',
  };
  const env: FakeEnv = {
    gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
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

  it('schedules frequency and a full gain envelope on the audio clock', () => {
    const { osc, env, ctx, setCurrentTime } = installFakeAudio();
    const destination = {} as AudioNode;
    const options = { ...makeOptions(), noteDurationSec: 0.11 };
    const sched = new SynthArpScheduler(ctx, destination, options);
    sched.start();
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(220, 0);
    expect(env.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
    expect(env.gain.linearRampToValueAtTime).toHaveBeenNthCalledWith(1, options.peakGain, 0.005);
    expect(env.gain.linearRampToValueAtTime).toHaveBeenNthCalledWith(2, 0, options.noteDurationSec);
    setCurrentTime(0.15);
    vi.advanceTimersByTime(25);
    expect(osc.frequency.setValueAtTime).toHaveBeenLastCalledWith(277.18, 0.18);
    expect(env.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0,
      0.18 + options.noteDurationSec,
    );
    sched.stop();
  });

  it('skips stale notes after the scheduler was throttled', () => {
    const { osc, ctx, setCurrentTime } = installFakeAudio();
    const sched = new SynthArpScheduler(ctx, {} as AudioNode, makeOptions());
    sched.start();
    setCurrentTime(60);
    vi.advanceTimersByTime(25);
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledTimes(2);
    expect(osc.frequency.setValueAtTime).toHaveBeenLastCalledWith(expect.any(Number), 60);
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
