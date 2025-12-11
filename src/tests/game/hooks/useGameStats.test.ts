import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useGameStats } from '../../../game/hooks/useGameStats';

describe('useGameStats', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useGameStats());

    expect(result.current.gameState.money).toBe(150);
    expect(result.current.gameState.lives).toBe(20);
    expect(result.current.gameState.wave).toBe(1);
    expect(result.current.gameState.gameStatus).toBe('idle');
    expect(result.current.gameState.isPlaying).toBe(false);
  });

  it('starts game correctly', () => {
    const { result } = renderHook(() => useGameStats());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.gameState.isPlaying).toBe(true);
    expect(result.current.gameState.gameStatus).toBe('playing');
    expect(result.current.gameState.money).toBe(150); // Should be reset/set
  });

  it('resets game correctly', () => {
    const { result } = renderHook(() => useGameStats());

    // First modify state
    act(() => {
      result.current.setGameState(prev => ({ ...prev, money: 500, lives: 5 }));
    });

    expect(result.current.gameState.money).toBe(500);
    expect(result.current.gameState.lives).toBe(5);

    // Then reset
    act(() => {
        result.current.resetGame();
    });

    expect(result.current.gameState.money).toBe(150);
    expect(result.current.gameState.lives).toBe(20);
    expect(result.current.gameState.gameStatus).toBe('idle');
    expect(result.current.gameState.isPlaying).toBe(false);
  });
});
