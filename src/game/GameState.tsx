import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import type {
  EnemyEntity,
  GameState,
  ProjectileEntity,
  TowerEntity,
  TowerType,
  EffectEntity,
  WaveState,
} from '../types';
import { useWaveManager } from './useWaveManager';
import { useGameStats } from './hooks/useGameStats';
import { useTowerState } from './hooks/useTowerState';
import { useEntityState } from './hooks/useEntityState';

/**
 * Interface defining the properties and methods available in the GameContext.
 */
interface GameContextProps {
  /** Current global game state (money, lives, wave, etc). */
  gameState: GameState;
  /** List of currently active enemies. */
  enemies: EnemyEntity[];
  /** List of placed towers. */
  towers: TowerEntity[];
  /** List of active projectiles. */
  projectiles: ProjectileEntity[];
  /** List of visual effects. */
  effects: EffectEntity[];
  /** Current state of the wave system. */
  waveState?: WaveState;
  /**
   * Places a tower on the grid.
   * @param x - The x-coordinate of the grid.
   * @param z - The z-coordinate of the grid.
   * @param type - The type of tower to place.
   */
  placeTower: (x: number, z: number, type: TowerType) => void;
  /** Starts the game session. */
  startGame: () => void;
  /** Resets the game to its initial state. */
  resetGame: () => void;
  /** Currently selected tower type for building (null if none). */
  selectedTower: TowerType | null;
  /** Sets the currently selected tower type for building. */
  setSelectedTower: (t: TowerType | null) => void;
  /** ID of the currently selected tower entity (for upgrading/selling). */
  selectedEntityId: string | null;
  /** Sets the ID of the selected tower entity. */
  setSelectedEntityId: (id: string | null) => void;
  /**
   * Upgrades a specific tower.
   * @param id - The ID of the tower to upgrade.
   */
  upgradeTower: (id: string) => void;
  /**
   * Sells a specific tower.
   * @param id - The ID of the tower to sell.
   */
  sellTower: (id: string) => void;

  /**
   * Checks if a tower can be placed at the given coordinates.
   * @param x - The x-coordinate of the grid.
   * @param z - The z-coordinate of the grid.
   * @returns True if placement is valid, false otherwise.
   */
  isValidPlacement: (x: number, z: number) => boolean;
  /** State setter for enemies list. */
  setEnemies: React.Dispatch<React.SetStateAction<EnemyEntity[]>>;
  /** State setter for towers list. */
  setTowers: React.Dispatch<React.SetStateAction<TowerEntity[]>>;
  /** State setter for projectiles list. */
  setProjectiles: React.Dispatch<React.SetStateAction<ProjectileEntity[]>>;
  /** State setter for effects list. */
  setEffects: React.Dispatch<React.SetStateAction<EffectEntity[]>>;
  /** State setter for global game state. */
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  /** State setter for wave state. */
  setWaveState?: React.Dispatch<React.SetStateAction<WaveState>>;
  /** Reset wave state manually. */
  resetWave?: () => void;
  /** Method to update wave logic (delta time). */
  updateWave?: (delta: number, currentEnemies: EnemyEntity[]) => void;
}

/** Context for managing game state. */
const GameContext = createContext<GameContextProps | undefined>(undefined);

/**
 * Hook to access the GameContext.
 *
 * @throws Error if used outside of a GameProvider.
 * @returns The GameContextProps.
 */
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

/**
 * Provider component that wraps the game and manages state.
 *
 * @param props - Component properties.
 * @param props.children - Child components to render.
 */
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { gameState, setGameState, startGame: startGameStats, resetGame: resetGameStats } = useGameStats();

  const {
    enemies,
    setEnemies,
    projectiles,
    setProjectiles,
    effects,
    setEffects,
  } = useEntityState();

  const {
    towers,
    setTowers,
    selectedTower,
    setSelectedTower,
    selectedEntityId,
    setSelectedEntityId,
    placeTower,
    upgradeTower,
    sellTower,
    isValidPlacement,
  } = useTowerState(gameState, setGameState);

  const { waveState, updateWave, resetWave } = useWaveManager(gameState.isPlaying, setEnemies, setGameState);

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
  }, [startGameStats, resetWave, setEnemies, setTowers, setProjectiles, setEffects, setSelectedEntityId]);

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
  }, [resetGameStats, resetWave, setEnemies, setTowers, setProjectiles, setEffects, setSelectedEntityId]);

  return (
    <GameContext.Provider
      value={{
        gameState,
        enemies,
        towers,
        projectiles,
        effects,
        placeTower,
        startGame,
        resetGame,
        selectedTower,
        setSelectedTower,
        selectedEntityId,
        setSelectedEntityId,
        upgradeTower,
        sellTower,
        isValidPlacement,
        setEnemies,
        setTowers,
        setProjectiles,
        setEffects,
        setGameState,
        waveState,
        updateWave,
        resetWave,
        setWaveState: undefined, // Managed internally by hook
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
