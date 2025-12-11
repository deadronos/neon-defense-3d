import { useState, useCallback } from 'react';
import type { GameState } from '../../types';

/**
 * Hook to manage the global game statistics and status.
 * @returns An object containing the game state and methods to update it.
 */
export const useGameStats = () => {
  const [gameState, setGameState] = useState<GameState>({
    money: 150,
    lives: 20,
    wave: 1,
    isPlaying: false,
    gameStatus: 'idle', // 'idle' | 'playing' | 'gameover' | 'victory'
    currentMapIndex: 0,
    researchPoints: 0,
    totalDamageDealt: 0,
    totalCurrencyEarned: 0,
    upgrades: {},
  });

  /**
   * Initializes the game state for a new session.
   */
  const startGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isPlaying: true,
      gameStatus: 'playing',
      lives: 20,
      money: 150,
      wave: 1,
      currentMapIndex: 0,
      researchPoints: 0,
      totalDamageDealt: 0,
      totalCurrencyEarned: 0,
      upgrades: {},
    }));
  }, []);

  /**
   * Resets the game state to default values (idle).
   */
  const resetGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isPlaying: false,
      gameStatus: 'idle',
      lives: 20,
      money: 150,
      wave: 1,
      currentMapIndex: 0,
      researchPoints: 0,
      totalDamageDealt: 0,
      totalCurrencyEarned: 0,
      upgrades: {},
    }));
  }, []);

  return {
    gameState,
    setGameState,
    startGame,
    resetGame,
  };
};
