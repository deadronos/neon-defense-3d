import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

import { useGameUi, useRenderState } from '../gameContexts';

const FIXED_STEP = 1 / 60;
const MAX_FRAME_TIME = 0.25;

/**
 * Component that hooks into the render loop to handle game logic updates.
 */
export const GameLoopBridge = () => {
  const { gameState, gameSpeed, step } = useGameUi();
  const renderStateRef = useRenderState();
  const accumulatorRef = useRef(0);
  const simTimeRef = useRef(0);

  useFrame((_, delta) => {
    const status = gameState.gameStatus;
    if (status !== 'playing') {
      accumulatorRef.current = 0;
      renderStateRef.current.renderAlpha = 0;
      return;
    }

    const clampedDelta = Math.min(delta, MAX_FRAME_TIME);
    accumulatorRef.current += clampedDelta * gameSpeed;

    while (accumulatorRef.current >= FIXED_STEP) {
      simTimeRef.current += FIXED_STEP;
      step(FIXED_STEP, simTimeRef.current);
      accumulatorRef.current -= FIXED_STEP;
    }

    renderStateRef.current.renderAlpha = accumulatorRef.current / FIXED_STEP;
  });

  return null;
};
