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
    expect(computeNextDpr(0.4, 0, TUNING)).toBe(0.5);
  });

  it('clamps dpr to maxDpr at or above maxDpr', () => {
    expect(computeNextDpr(2.0, 240, TUNING)).toBe(2);
    expect(computeNextDpr(2.1, 240, TUNING)).toBe(2);
  });

  it('returns currentDpr unchanged when fps is NaN or Infinity', () => {
    expect(computeNextDpr(1.0, Number.NaN, TUNING)).toBe(1.0);
    expect(computeNextDpr(1.0, Number.POSITIVE_INFINITY, TUNING)).toBe(1.0);
    expect(computeNextDpr(1.0, Number.NEGATIVE_INFINITY, TUNING)).toBe(1.0);
  });
});
