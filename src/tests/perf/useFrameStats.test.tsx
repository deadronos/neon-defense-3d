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
