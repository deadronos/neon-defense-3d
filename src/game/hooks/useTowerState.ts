import { useState, useCallback } from 'react';
import { Vector3 } from 'three';
import { MAP_GRID, TOWER_CONFIGS, TILE_SIZE } from '../../constants';
import { TileType } from '../../types';
import type { TowerEntity, TowerType, GameState } from '../../types';

/**
 * Hook to manage tower entities, selection, and placement logic.
 *
 * @param gameState - The current game state (needed for money check).
 * @param setGameState - Function to update game state (needed for deducting money).
 * @returns An object containing tower state and management methods.
 */
export const useTowerState = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => {
  const [towers, setTowers] = useState<TowerEntity[]>([]);
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

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
    [towers]
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
    [gameState.money, isValidPlacement, setGameState]
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
        })
      );
    },
    [gameState.money, setGameState]
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
    [towers, setGameState]
  );

  return {
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
  };
};
