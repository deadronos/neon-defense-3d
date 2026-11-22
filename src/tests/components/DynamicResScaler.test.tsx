import { render, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { DynamicResScaler } from '../../game/components/DynamicResScaler';

let frameCallback: (() => void) | null = null;
const setDpr = vi.fn();

vi.mock('@react-three/fiber', () => ({
  useFrame: (fn: () => void) => {
    frameCallback = fn;
  },
  useThree: (selector: (state: { setDpr: typeof setDpr }) => unknown) => selector({ setDpr }),
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

  it('recovers at 60 Hz only after sustained healthy samples', () => {
    render(<DynamicResScaler />);
    const initialDpr = setDpr.mock.calls[0]?.[0] ?? 1;

    now = 1000;
    act(() => frameCallback?.());
    expect(setDpr).toHaveBeenLastCalledWith(initialDpr - 0.1);

    const runFrames = (fps: number, seconds: number) => {
      act(() => {
        for (let i = 0; i < fps * seconds; i += 1) {
          now += 1000 / fps;
          frameCallback?.();
        }
      });
    };

    runFrames(56, 2);
    expect(setDpr).toHaveBeenCalledTimes(2);
    runFrames(60, 0.5);
    expect(setDpr).toHaveBeenCalledTimes(2);
    runFrames(56, 2);
    expect(setDpr).toHaveBeenCalledTimes(2);
    runFrames(60, 3);
    expect(setDpr).toHaveBeenLastCalledWith(initialDpr);
    expect(setDpr).toHaveBeenCalledTimes(3);
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
