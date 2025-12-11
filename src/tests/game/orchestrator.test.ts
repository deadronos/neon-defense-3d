import { renderHook, act } from '@testing-library/react';
import { useGameOrchestrator } from '../../game/orchestrator';
import { describe, it, expect, vi } from 'vitest';
import { GameState, UpgradeType } from '../../types';

describe('useGameOrchestrator', () => {
  const mockGameState: GameState = {
    money: 100,
    lives: 20,
    wave: 1,
    gameStatus: 'idle',
    isGameOver: false,
    isPlaying: false,
    researchPoints: 50,
    currentMapIndex: 0,
    upgrades: {},
    totalDamageDealt: 0,
    totalCurrencyEarned: 0,
  };

  const mockSetGameState = vi.fn();
  const mockSetEnemies = vi.fn();
  const mockSetTowers = vi.fn();
  const mockSetProjectiles = vi.fn();
  const mockSetEffects = vi.fn();
  const mockSetSelectedEntityId = vi.fn();
  const mockStartGameStats = vi.fn();
  const mockResetGameStats = vi.fn();
  const mockResetWave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize game when startGame is called', () => {
    const { result } = renderHook(() =>
      useGameOrchestrator(
        mockGameState,
        mockSetGameState,
        mockSetEnemies,
        mockSetTowers,
        mockSetProjectiles,
        mockSetEffects,
        mockSetSelectedEntityId,
        mockStartGameStats,
        mockResetGameStats,
        mockResetWave
      )
    );

    act(() => {
      result.current.startGame();
    });

    expect(mockStartGameStats).toHaveBeenCalled();
    expect(mockResetWave).toHaveBeenCalled();
    expect(mockSetEnemies).toHaveBeenCalledWith([]);
    expect(mockSetTowers).toHaveBeenCalledWith([]);
    expect(mockSetProjectiles).toHaveBeenCalledWith([]);
    expect(mockSetEffects).toHaveBeenCalledWith([]);
    expect(mockSetSelectedEntityId).toHaveBeenCalledWith(null);
  });

  it('should reset game when resetGame is called', () => {
    const { result } = renderHook(() =>
      useGameOrchestrator(
        mockGameState,
        mockSetGameState,
        mockSetEnemies,
        mockSetTowers,
        mockSetProjectiles,
        mockSetEffects,
        mockSetSelectedEntityId,
        mockStartGameStats,
        mockResetGameStats,
        mockResetWave
      )
    );

    act(() => {
      result.current.resetGame();
    });

    expect(mockResetGameStats).toHaveBeenCalled();
    expect(mockResetWave).toHaveBeenCalled();
    expect(mockSetEnemies).toHaveBeenCalledWith([]);
    expect(mockSetTowers).toHaveBeenCalledWith([]);
    expect(mockSetProjectiles).toHaveBeenCalledWith([]);
    expect(mockSetEffects).toHaveBeenCalledWith([]);
    expect(mockSetSelectedEntityId).toHaveBeenCalledWith(null);
  });

  it('should advance to next sector', () => {
    const { result } = renderHook(() =>
      useGameOrchestrator(
        mockGameState,
        mockSetGameState,
        mockSetEnemies,
        mockSetTowers,
        mockSetProjectiles,
        mockSetEffects,
        mockSetSelectedEntityId,
        mockStartGameStats,
        mockResetGameStats,
        mockResetWave
      )
    );

    act(() => {
      result.current.startNextSector();
    });

    expect(mockSetEnemies).toHaveBeenCalledWith([]);
    expect(mockSetTowers).toHaveBeenCalledWith([]);
    expect(mockSetProjectiles).toHaveBeenCalledWith([]);
    expect(mockSetEffects).toHaveBeenCalledWith([]);
    expect(mockSetSelectedEntityId).toHaveBeenCalledWith(null);

    // Verify setGameState update function
    expect(mockSetGameState).toHaveBeenCalled();
    const updateFn = mockSetGameState.mock.calls[0][0];
    const newState = updateFn(mockGameState);
    expect(newState.currentMapIndex).toBe(1);
    expect(newState.gameStatus).toBe('playing');
  });

  it('should purchase upgrade if affordable', () => {
    const { result } = renderHook(() =>
      useGameOrchestrator(
        mockGameState,
        mockSetGameState,
        mockSetEnemies,
        mockSetTowers,
        mockSetProjectiles,
        mockSetEffects,
        mockSetSelectedEntityId,
        mockStartGameStats,
        mockResetGameStats,
        mockResetWave
      )
    );

    act(() => {
      result.current.purchaseUpgrade(UpgradeType.TOWER_DAMAGE, 20);
    });

    expect(mockSetGameState).toHaveBeenCalled();
    const updateFn = mockSetGameState.mock.calls[0][0];
    const newState = updateFn(mockGameState);
    expect(newState.researchPoints).toBe(30); // 50 - 20
    expect(newState.upgrades[UpgradeType.TOWER_DAMAGE]).toBe(1);
  });

  it('should not purchase upgrade if not affordable', () => {
    const { result } = renderHook(() =>
      useGameOrchestrator(
        mockGameState,
        mockSetGameState,
        mockSetEnemies,
        mockSetTowers,
        mockSetProjectiles,
        mockSetEffects,
        mockSetSelectedEntityId,
        mockStartGameStats,
        mockResetGameStats,
        mockResetWave
      )
    );

    act(() => {
      result.current.purchaseUpgrade(UpgradeType.TOWER_DAMAGE, 100);
    });

    expect(mockSetGameState).toHaveBeenCalled();
    const updateFn = mockSetGameState.mock.calls[0][0];
    const newState = updateFn(mockGameState);
    expect(newState).toBe(mockGameState); // No change
  });
});
