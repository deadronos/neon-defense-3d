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
    const start = performance.now();
    stats.recordFrame(start);
    lastCheckRef.current = start;
    setDpr(dprRef.current);
  }, [setDpr, stats]);

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
