import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Vector3 } from 'three';

import { MAP_GRID, TOWER_CONFIGS, TILE_SIZE } from '../constants';
import type {
  EnemyEntity,
  GameState,
  ProjectileEntity,
  TowerEntity,
  TowerType,
  EffectEntity,
} from '../types';
import { TileType } from '../types';

interface GameContextProps {
  gameState: GameState;
  enemies: EnemyEntity[];
  towers: TowerEntity[];
  projectiles: ProjectileEntity[];
  effects: EffectEntity[];
  placeTower: (x: number, z: number, type: TowerType) => void;
  startGame: () => void;
  resetGame: () => void;
  // Selected Tower Type (for building)
  selectedTower: TowerType | null;
  setSelectedTower: (t: TowerType | null) => void;
  // Selected Tower Entity (for upgrading)
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  upgradeTower: (id: string) => void;
  sellTower: (id: string) => void;

  isValidPlacement: (x: number, z: number) => boolean;
  setEnemies: React.Dispatch<React.SetStateAction<EnemyEntity[]>>;
  setTowers: React.Dispatch<React.SetStateAction<TowerEntity[]>>;
  setProjectiles: React.Dispatch<React.SetStateAction<ProjectileEntity[]>>;
  setEffects: React.Dispatch<React.SetStateAction<EffectEntity[]>>;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

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

  const startGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isPlaying: true,
      gameStatus: 'playing',
      lives: 20,
      money: 150,
      wave: 1,
    }));
    setEnemies([]);
    setTowers([]);
    setProjectiles([]);
    setEffects([]);
    setSelectedEntityId(null);
  }, []);

  const resetGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isPlaying: false,
      gameStatus: 'idle',
      lives: 20,
      money: 150,
      wave: 1,
    }));
    setEnemies([]);
    setTowers([]);
    setProjectiles([]);
    setEffects([]);
    setSelectedEntityId(null);
  }, []);

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
        };
        setTowers((prev) => [...prev, newTower]);
        setSelectedTower(null); // Deselect build tool after placement
      }
    },
    [gameState.money, isValidPlacement],
  );

  const upgradeTower = useCallback(
    (id: string) => {
      setTowers((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;

          const config = TOWER_CONFIGS[t.type];
          const upgradeCost = Math.floor(config.cost * Math.pow(1.5, t.level));

          if (gameState.money >= upgradeCost) {
            setGameState((g) => ({ ...g, money: g.money - upgradeCost }));
            return { ...t, level: t.level + 1 };
          }
          return t;
        }),
      );
    },
    [gameState.money],
  );

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
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
