import { useFrame } from '@react-three/fiber';

import { useGame } from '../GameState';
import { useEnemyBehavior } from '../hooks/useEnemyBehavior';
import { useProjectileBehavior } from '../hooks/useProjectileBehavior';
import { useTowerBehavior } from '../hooks/useTowerBehavior';

/**
 * Component that hooks into the render loop to handle game logic updates.
 */
export const GameLoopBridge = () => {
  const {
    gameState,
    enemies,
    setEnemies,
    setProjectiles,
    setTowers,
    setGameState,
    setEffects,
    updateWave,
    pathWaypoints,
  } = useGame();

  const { updateEnemies } = useEnemyBehavior();
  const { updateTowers } = useTowerBehavior();
  const { updateProjectiles } = useProjectileBehavior();

  useFrame((state, delta) => {
    if (gameState.gameStatus !== 'playing') return;

    // Delegate wave management
    if (updateWave) updateWave(delta, enemies);

    // Enemy Move
    setEnemies((prevEnemies) => updateEnemies(prevEnemies, delta, setGameState, pathWaypoints));

    // Towers Firing
    const now = state.clock.elapsedTime;
    setTowers((prevTowers) => updateTowers(prevTowers, enemies, now, setProjectiles));

    // Calculate Greed Multiplier
    const greedLevel = gameState.upgrades?.['GLOBAL_GREED'] || 0;
    const greedMultiplier = 1 + greedLevel * 0.05;

    // Projectile Move & Collision
    setProjectiles((prevProjectiles) =>
      updateProjectiles(
        prevProjectiles,
        enemies,
        delta,
        now,
        setEnemies,
        setGameState,
        setEffects,
        greedMultiplier,
      ),
    );
  });

  return null;
};
