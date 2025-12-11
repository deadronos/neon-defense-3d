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
import { MAP_LAYOUTS, getMapGrid, generatePath } from '../constants';
import { TileType, Vector2, UpgradeType } from '../types';

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
  /** Current Map Grid. */
  mapGrid: TileType[][];
  /** Current Path Waypoints. */
  pathWaypoints: Vector2[];
  /** Advance to the next sector (map). */
  startNextSector: () => void;
  /** Purchase an upgrade. */
  purchaseUpgrade: (type: UpgradeType, cost: number) => void;
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
  const {
    gameState,
    setGameState,
    startGame: startGameStats,
    resetGame: resetGameStats,
  } = useGameStats();

  const { enemies, setEnemies, projectiles, setProjectiles, effects, setEffects } =
    useEntityState();

  // Derive Map Data
  const currentMapLayout = MAP_LAYOUTS[gameState.currentMapIndex % MAP_LAYOUTS.length];
  // Memoize these if performance becomes an issue, but map index changes rarely.
  const mapGrid = getMapGrid(currentMapLayout);
  const pathWaypoints = generatePath(currentMapLayout);

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
  } = useTowerState(gameState, setGameState, mapGrid);

  const { waveState, updateWave, resetWave } = useWaveManager(
    gameState,
    setEnemies,
    setGameState,
    pathWaypoints,
  );

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

    // 4. Reset Wave Manager state to preparing for next wave
    // We don't want to reset wave number to 0, just phase.
    // This requires exposing a way to set phase or just calling resetWave?
    // If resetWave sets wave to 0, we can't use it.
    // Let's assume for now we just change gameStatus and useWaveManager reacts or we add a specific "nextSector" method to wave manager.
    // Actually, useWaveManager needs to be told "we are ready for next wave".
    // If we are in 'victory', we need to transition.
    // We'll fix useWaveManager logic next.
  }, [
    gameState.upgrades,
    setEnemies,
    setTowers,
    setProjectiles,
    setEffects,
    setSelectedEntityId,
    setGameState,
  ]);

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
        mapGrid: getMapGrid(MAP_LAYOUTS[gameState.currentMapIndex % MAP_LAYOUTS.length]),
        pathWaypoints: generatePath(MAP_LAYOUTS[gameState.currentMapIndex % MAP_LAYOUTS.length]),
        startNextSector,
        purchaseUpgrade,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
