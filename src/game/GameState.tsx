import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Vector3 } from 'three';

import { MAP_GRID, TOWER_CONFIGS, TILE_SIZE } from '../constants';
import type {
  EnemyEntity,
  GameState,
  ProjectileEntity,
  TowerEntity,
  TowerType,
  EffectEntity,
  WaveState,
} from '../types';
import { TileType } from '../types';
import { useWaveManager } from './useWaveManager';

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
  const [gameState, setGameState] = useState<GameState>({
    money: 150,
    lives: 20,
    wave: 1,
    isPlaying: false,
    gameStatus: 'idle', // 'idle' | 'playing' | 'gameover'
  });

  const [enemies, setEnemies] = useState<EnemyEntity[]>([]);
  const [towers, setTowers] = useState<TowerEntity[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileEntity[]>([]);
  const [effects, setEffects] = useState<EffectEntity[]>([]);
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const { waveState, updateWave, resetWave } = useWaveManager(gameState.isPlaying, setEnemies, setGameState);

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
    }));
    resetWave();
    setEnemies([]);
    setTowers([]);
    setProjectiles([]);
    setEffects([]);
    setSelectedEntityId(null);
  }, [resetWave]);

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
    }));
    resetWave(); // Ensure wave state is reset to 0
    setEnemies([]);
    setTowers([]);
    setProjectiles([]);
    setEffects([]);
    setSelectedEntityId(null);
  }, [resetWave]);

  /**
   * Validates if a tower can be placed at the specified grid coordinates.
   *
   * @param x - Grid X coordinate.
   * @param z - Grid Z coordinate.
   * @returns True if the tile is buildable (Grass) and empty.
   */
  const isValidPlacement = useCallback(
    (x: number, z: number) => {
      // Check map bounds
      if (x < 0 || x >= MAP_GRID[0].length || z < 0 || z >= MAP_GRID.length) return false;
      // Check tile type (Must be 0: Grass)
      if (MAP_GRID[z][x] !== TileType.Grass) return false;
      // Check existing towers
      if (towers.some((t) => t.gridPos[0] === x && t.gridPos[1] === z)) return false;
      return true;
    },
    [towers],
  );

  /**
   * Attempts to place a tower at the specified location.
   * Deducts cost from money if successful.
   *
   * @param x - Grid X coordinate.
   * @param z - Grid Z coordinate.
   * @param type - Type of tower to place.
   */
  const placeTower = useCallback(
    (x: number, z: number, type: TowerType) => {
      const config = TOWER_CONFIGS[type];
      if (gameState.money >= config.cost && isValidPlacement(x, z)) {
        setGameState((prev) => ({ ...prev, money: prev.money - config.cost }));
        const newTower: TowerEntity = {
          id: Math.random().toString(),
          type,
          gridPos: [x, z],
          position: new Vector3(x * TILE_SIZE, 0.5, z * TILE_SIZE),
          lastFired: 0,
          targetId: null,
          level: 1,
        } as any;
        setTowers((prev) => [...prev, newTower]);
        setSelectedTower(null); // Deselect build tool after placement
      }
    },
    [gameState.money, isValidPlacement],
  );

  /**
   * Upgrades the specified tower if the player has enough money.
   * Increases tower level and deducts cost.
   *
   * @param id - ID of the tower to upgrade.
   */
  const upgradeTower = useCallback(
    (id: string) => {
      setTowers((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;

          const config = TOWER_CONFIGS[t.type];
          const upgradeCost = Math.floor(config.cost * Math.pow(1.5, t.level));

          if (gameState.money >= upgradeCost) {
            setGameState((g) => ({ ...g, money: g.money - upgradeCost }));
            return { ...t, level: t.level + 1 } as any;
          }
          return t;
        }),
      );
    },
    [gameState.money],
  );

  /**
   * Sells the specified tower and refunds a portion of the cost.
   *
   * @param id - ID of the tower to sell.
   */
  const sellTower = useCallback(
    (id: string) => {
      const tower = towers.find((t) => t.id === id);
      if (!tower) return;

      // Refund 70% of base cost + some factor of upgrades
      const config = TOWER_CONFIGS[tower.type];
      // Simple refund logic: Base cost * 0.7
      const refund = Math.floor(config.cost * 0.7);

      setGameState((g) => ({ ...g, money: g.money + refund }));
      setTowers((prev) => prev.filter((t) => t.id !== id));
      setSelectedEntityId(null);
    },
    [towers],
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
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
