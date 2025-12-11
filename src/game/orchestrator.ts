import React, { useCallback } from 'react';
import {
  EnemyEntity,
  GameState,
  TowerEntity,
  ProjectileEntity,
  EffectEntity,
  UpgradeType,
} from '../types';

/**
 * Hook to manage game orchestration logic (start, reset, next sector, upgrades).
 *
 * @param gameState - The current game state.
 * @param setGameState - Setter for the game state.
 * @param setEnemies - Setter for enemies list.
 * @param setTowers - Setter for towers list.
 * @param setProjectiles - Setter for projectiles list.
 * @param setEffects - Setter for effects list.
 * @param setSelectedEntityId - Setter for selected entity ID.
 * @param startGameStats - Function to initialize game stats.
 * @param resetGameStats - Function to reset game stats.
 * @param resetWave - Function to reset wave state.
 *
 * @returns Object containing orchestration methods: startGame, resetGame, startNextSector, purchaseUpgrade.
 */
export const useGameOrchestrator = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  setEnemies: React.Dispatch<React.SetStateAction<EnemyEntity[]>>,
  setTowers: React.Dispatch<React.SetStateAction<TowerEntity[]>>,
  setProjectiles: React.Dispatch<React.SetStateAction<ProjectileEntity[]>>,
  setEffects: React.Dispatch<React.SetStateAction<EffectEntity[]>>,
  setSelectedEntityId: (id: string | null) => void,
  startGameStats: () => void,
  resetGameStats: () => void,
  resetWave: () => void,
) => {

  /**
   * Initializes the game state for a new session.
   */
  const startGame = useCallback(() => {
    startGameStats();
    resetWave();
    setEnemies([]);
    setTowers([]);
    setProjectiles([]);
    setEffects([]);
    setSelectedEntityId(null);
  }, [
    startGameStats,
    resetWave,
    setEnemies,
    setTowers,
    setProjectiles,
    setEffects,
    setSelectedEntityId,
  ]);

  /**
   * Resets the game state to default values (idle).
   */
  const resetGame = useCallback(() => {
    resetGameStats();
    resetWave(); // Ensure wave state is reset to 0
    setEnemies([]);
    setTowers([]);
    setProjectiles([]);
    setEffects([]);
    setSelectedEntityId(null);
  }, [
    resetGameStats,
    resetWave,
    setEnemies,
    setTowers,
    setProjectiles,
    setEffects,
    setSelectedEntityId,
  ]);

  /**
   * Advances the game to the next map sector.
   */
  const startNextSector = useCallback(() => {
    // 1. Calculate new starting money based on Greed
    const greedLevel = gameState.upgrades[UpgradeType.GLOBAL_GREED] || 0;
    const startMoney = 150 * (1 + greedLevel * 0.05);

    // 2. Clear entities
    setEnemies([]);
    setTowers([]);
    setProjectiles([]);
    setEffects([]);
    setSelectedEntityId(null);

    // 3. Update Game State (Map + Money + Status)
    setGameState((prev) => ({
      ...prev,
      currentMapIndex: prev.currentMapIndex + 1,
      money: startMoney,
      gameStatus: 'playing', // Resume playing
      isPlaying: true,
      totalDamageDealt: 0,
      totalCurrencyEarned: 0,
    }));
  }, [
    gameState.upgrades,
    setEnemies,
    setTowers,
    setProjectiles,
    setEffects,
    setSelectedEntityId,
    setGameState,
  ]);

  /**
   * Purchases a global upgrade using research points.
   *
   * @param type - The type of upgrade to purchase.
   * @param cost - The cost of the upgrade.
   */
  const purchaseUpgrade = useCallback(
    (type: UpgradeType, cost: number) => {
      setGameState((prev) => {
        if (prev.researchPoints < cost) return prev;
        const currentLevel = prev.upgrades[type] || 0;
        return {
          ...prev,
          researchPoints: prev.researchPoints - cost,
          upgrades: {
            ...prev.upgrades,
            [type]: currentLevel + 1,
          },
        };
      });
    },
    [setGameState],
  );

  return {
    startGame,
    resetGame,
    startNextSector,
    purchaseUpgrade,
  };
};
