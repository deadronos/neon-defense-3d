import { describe, expect, it } from 'vitest';

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
