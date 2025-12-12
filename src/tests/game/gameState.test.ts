import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GameProvider, useGame } from '../../game/GameState';
import { TowerType } from '../../types';

describe('GameProvider (engine-backed)', () => {
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
});

