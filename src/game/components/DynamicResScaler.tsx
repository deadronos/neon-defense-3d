import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

const TARGET_FPS = 60;
const FPS_TOLERANCE = 5;
const CHECK_INTERVAL_MS = 500;
const MIN_DPR = 0.5;
const MAX_DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1;
const STEP = 0.1;

export const DynamicResScaler = () => {
  const setDpr = useThree((state) => state.setDpr);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const dprRef = useRef(MAX_DPR);

  useEffect(() => {
    setDpr(dprRef.current);
  }, [setDpr]);

  useFrame(() => {
    frameCount.current += 1;
    const now = performance.now();
    const elapsed = now - lastTime.current;

    if (elapsed < CHECK_INTERVAL_MS) return;

    const fps = Math.round((frameCount.current * 1000) / elapsed);
    frameCount.current = 0;
    lastTime.current = now;

    let nextDpr = dprRef.current;
    if (fps < TARGET_FPS - FPS_TOLERANCE) {
      nextDpr = Math.max(MIN_DPR, dprRef.current - STEP);
    } else if (fps > TARGET_FPS + FPS_TOLERANCE) {
      nextDpr = Math.min(MAX_DPR, dprRef.current + STEP);
    }

    if (nextDpr !== dprRef.current) {
      dprRef.current = nextDpr;
      setDpr(nextDpr);
    }
  });

  return null;
};
