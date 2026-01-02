import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GameProvider, useGame } from '../../game/GameState';
import { TowerType } from '../../types';

vi.mock('../../game/audio/AudioManager', () => ({
  useAudio: () => ({
    playSFX: vi.fn(),
  }),
}));

describe('GameProvider (engine-backed)', () => {
  it('throws if useGame is used outside of GameProvider', () => {
    expect(() => renderHook(() => useGame())).toThrowError(/GameProvider/i);
  });

  it('does not allow placing towers while not playing', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });

    expect(result.current.gameState.gameStatus).toBe('idle');
    expect(result.current.towers).toHaveLength(0);
    expect(result.current.gameState.money).toBe(150);
  });

  it('validates placement: bounds, tile type, and occupied tiles', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.startGame();
    });

    // out of bounds
    expect(result.current.isValidPlacement(-1, 0)).toBe(false);
    expect(result.current.isValidPlacement(0, -1)).toBe(false);
    expect(result.current.isValidPlacement(999, 0)).toBe(false);

    // known non-grass tiles on MAP_1
    expect(result.current.isValidPlacement(0, 1)).toBe(false); // spawn
    expect(result.current.isValidPlacement(1, 1)).toBe(false); // path

    // place on a valid grass tile
    expect(result.current.isValidPlacement(0, 0)).toBe(true);
    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });
    expect(result.current.towers).toHaveLength(1);

    // now occupied
    expect(result.current.isValidPlacement(0, 0)).toBe(false);
    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });
    expect(result.current.towers).toHaveLength(1);
  });

  it('starts game and allows placing/upgrading/selling towers via actions', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.startGame();
    });

    expect(result.current.gameState.gameStatus).toBe('playing');
    expect(result.current.gameState.money).toBe(150);

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });

    expect(result.current.towers).toHaveLength(1);
    expect(result.current.gameState.money).toBe(100);

    const towerId = result.current.towers[0]!.id;

    act(() => {
      result.current.upgradeTower(towerId);
    });

    expect(result.current.towers[0]!.level).toBe(2);
    expect(result.current.gameState.money).toBe(25);

    act(() => {
      result.current.sellTower(towerId);
    });

    expect(result.current.towers).toHaveLength(0);
    expect(result.current.gameState.money).toBe(60);
  });

  it('does not place a tower if unaffordable (e.g. Sniper at game start)', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.placeTower(2, 0, TowerType.Sniper);
    });

    expect(result.current.towers).toHaveLength(0);
    expect(result.current.gameState.money).toBe(150);
  });

  it('clears selectedTower after placing a tower', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.startGame();
      result.current.setSelectedTower(TowerType.Basic);
    });
    expect(result.current.selectedTower).toBe(TowerType.Basic);

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });
    expect(result.current.selectedTower).toBeNull();
  });

  it('upgradeTower is a no-op when tower id is unknown', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.startGame();
      result.current.upgradeTower('missing');
    });

    expect(result.current.towers).toHaveLength(0);
    expect(result.current.gameState.money).toBe(150);
  });

  it('does not upgrade a tower when upgrade cost is unaffordable', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.startGame();
    });

    act(() => {
      // Rapid costs 120, leaving 30 which is < upgradeCost (180)
      result.current.placeTower(0, 0, TowerType.Rapid);
    });

    const towerId = result.current.towers[0]!.id;
    expect(result.current.gameState.money).toBe(30);

    act(() => {
      result.current.upgradeTower(towerId);
    });

    expect(result.current.towers[0]!.level).toBe(1);
    expect(result.current.gameState.money).toBe(30);
  });

  it('setGraphicsQuality and selection setters update UI state', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.setGraphicsQuality('low');
      result.current.setSelectedEntityId('tower-1');
      result.current.setSelectedTower(TowerType.Sniper);
    });

    expect(result.current.gameState.graphicsQuality).toBe('low');
    expect(result.current.selectedEntityId).toBe('tower-1');
    expect(result.current.selectedTower).toBe(TowerType.Sniper);
  });

  it('resetGame clears towers and returns to idle', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });
    expect(result.current.towers).toHaveLength(1);

    act(() => {
      result.current.resetGame();
    });

    expect(result.current.gameState.gameStatus).toBe('idle');
    expect(result.current.towers).toHaveLength(0);
    expect(result.current.gameState.money).toBe(150);
  });

  it('startNextSector advances the map index and resets tower placement', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });
    expect(result.current.towers).toHaveLength(1);

    act(() => {
      result.current.startNextSector();
    });

    expect(result.current.gameState.currentMapIndex).toBe(1);
    expect(result.current.towers).toHaveLength(0);
    expect(result.current.gameState.gameStatus).toBe('playing');
  });
});
