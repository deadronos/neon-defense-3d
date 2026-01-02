import { render, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { DynamicResScaler } from '../../game/components/DynamicResScaler';

let frameCallback: (() => void) | null = null;
const setDpr = vi.fn();

vi.mock('@react-three/fiber', () => ({
  useFrame: (fn: () => void) => {
    frameCallback = fn;
  },
  useThree: (selector: (state: { setDpr: typeof setDpr }) => unknown) =>
    selector({ setDpr }),
}));

describe('DynamicResScaler', () => {
  let now = 0;
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    frameCallback = null;
    setDpr.mockClear();
    now = 0;
    nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('decreases DPR on low FPS and increases back on high FPS', async () => {
    render(<DynamicResScaler />);

    await waitFor(() => {
      expect(setDpr).toHaveBeenCalled();
    });

    const initialDpr = setDpr.mock.calls[0]?.[0] ?? 1;

    now = 1000;
    act(() => {
      frameCallback?.();
    });
    const afterLowFps = setDpr.mock.calls.at(-1)?.[0] ?? initialDpr;
    expect(afterLowFps).toBeCloseTo(initialDpr - 0.1, 5);

    for (let i = 0; i < 39; i += 1) {
      now = 1400;
      act(() => {
        frameCallback?.();
      });
    }

    now = 1500;
    act(() => {
      frameCallback?.();
    });

    const afterHighFps = setDpr.mock.calls.at(-1)?.[0] ?? initialDpr;
    expect(afterHighFps).toBeCloseTo(initialDpr, 5);
  });

  it('clamps DPR to the minimum bound under sustained low FPS', async () => {
    render(<DynamicResScaler />);

    await waitFor(() => {
      expect(setDpr).toHaveBeenCalled();
    });

    const initialDpr = setDpr.mock.calls[0]?.[0] ?? 1;
    const stepsToMin = Math.ceil((initialDpr - 0.5) / 0.1) + 1;

    for (let step = 1; step <= stepsToMin; step += 1) {
      now = step * 500;
      act(() => {
        frameCallback?.();
      });
    }

    const calls = setDpr.mock.calls.map((call) => call[0]);
    expect(calls[calls.length - 1]).toBe(0.5);
    expect(calls.every((value) => value >= 0.5)).toBe(true);
  });

  it('does not exceed the max DPR when FPS is high', async () => {
    render(<DynamicResScaler />);

    await waitFor(() => {
      expect(setDpr).toHaveBeenCalled();
    });

    for (let i = 0; i < 39; i += 1) {
      now = 400;
      act(() => {
        frameCallback?.();
      });
    }

    now = 500;
    act(() => {
      frameCallback?.();
    });

    expect(setDpr).toHaveBeenCalledTimes(1);
  });
});
