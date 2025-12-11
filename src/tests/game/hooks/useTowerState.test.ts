import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useTowerState } from '../../../game/hooks/useTowerState';
import { TileType, TowerType } from '../../../types';
import type { GameState } from '../../../types';

// Mock GameState
const mockSetGameState = vi.fn();
const defaultGameState: GameState = {
  money: 500,
  lives: 100,
  wave: 0,
  isPlaying: false,
  gameStatus: 'idle',
  currentMapIndex: 0,
  researchPoints: 0,
  totalDamageDealt: 0,
  totalCurrencyEarned: 0,
  upgrades: {},
};

// Mock MapGrid (3x3 grid)
// 0: Grass, 1: Path
const mockMapGrid = [
  [TileType.Grass, TileType.Grass, TileType.Grass],
  [TileType.Grass, TileType.Path, TileType.Grass],
  [TileType.Grass, TileType.Grass, TileType.Grass],
];

describe('useTowerState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates placement correctly', () => {
    const { result } = renderHook(() =>
      useTowerState(defaultGameState, mockSetGameState, mockMapGrid),
    );

    // Valid grass tile
    expect(result.current.isValidPlacement(0, 0)).toBe(true);
    // Invalid path tile
    expect(result.current.isValidPlacement(1, 1)).toBe(false);
    // Out of bounds
    expect(result.current.isValidPlacement(-1, 0)).toBe(false);
    expect(result.current.isValidPlacement(0, 10)).toBe(false);
  });

  it('places tower and deducts money', () => {
    const { result } = renderHook(() =>
      useTowerState(defaultGameState, mockSetGameState, mockMapGrid),
    );

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });

    expect(result.current.towers.length).toBe(1);
    expect(result.current.towers[0].type).toBe(TowerType.Basic);
    expect(result.current.towers[0].gridPos).toEqual([0, 0]);

    // Check money deduction
    expect(mockSetGameState).toHaveBeenCalled();
  });

  it('does not place tower if insufficient money', () => {
    const { result } = renderHook(() =>
      useTowerState({ ...defaultGameState, money: 0 }, mockSetGameState, mockMapGrid),
    );

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });

    expect(result.current.towers.length).toBe(0);
    expect(mockSetGameState).not.toHaveBeenCalled();
  });

  it('prevents placement on existing tower', () => {
    const { result } = renderHook(() =>
      useTowerState(defaultGameState, mockSetGameState, mockMapGrid),
    );

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });

    expect(result.current.isValidPlacement(0, 0)).toBe(false);

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });

    expect(result.current.towers.length).toBe(1); // Still 1
  });

  it('upgrades tower', () => {
    const { result } = renderHook(() =>
      useTowerState(defaultGameState, mockSetGameState, mockMapGrid),
    );

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });

    const towerId = result.current.towers[0].id;

    act(() => {
      result.current.upgradeTower(towerId);
    });

    expect(result.current.towers[0].level).toBe(2);
    expect(mockSetGameState).toHaveBeenCalledTimes(2); // Place + Upgrade
  });

  it('does not upgrade tower if insufficient money', () => {
    let gameState: GameState = { ...defaultGameState, money: 100 };

    const { result, rerender } = renderHook(
      ({ gs }) => useTowerState(gs, mockSetGameState, mockMapGrid),
      { initialProps: { gs: gameState } },
    );

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });

    // Simulate money spent (50 remaining). Upgrade cost is ~75.
    gameState = { ...gameState, money: 50 };
    rerender({ gs: gameState });

    const towerId = result.current.towers[0].id;
    mockSetGameState.mockClear();

    act(() => {
      result.current.upgradeTower(towerId);
    });

    expect(result.current.towers[0].level).toBe(1);
    expect(mockSetGameState).not.toHaveBeenCalled();
  });

  it('sells tower', () => {
    const { result } = renderHook(() =>
      useTowerState(defaultGameState, mockSetGameState, mockMapGrid),
    );

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });

    const towerId = result.current.towers[0].id;

    act(() => {
      result.current.sellTower(towerId);
    });

    expect(result.current.towers.length).toBe(0);
    expect(mockSetGameState).toHaveBeenCalledTimes(2); // Place + Sell
  });
});
