import { useFrame } from '@react-three/fiber';

import { useGame } from '../GameState';

/**
 * Component that hooks into the render loop to handle game logic updates.
 */
export const GameLoopBridge = () => {
  const { gameState, step } = useGame();

  useFrame((state, delta) => {
    if (gameState.gameStatus !== 'playing') return;
    step(delta, state.clock.elapsedTime);
  });

  return null;
};
