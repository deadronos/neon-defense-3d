import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useWaveManager } from '../../game/useWaveManager';
import type { Vector2 } from '../../types';

// Mocks
const mockSetEnemies = vi.fn();
const mockSetGameState = vi.fn();
const mockPathWaypoints: Vector2[] = [
  [0, 0],
  [0, 1],
  [1, 1],
];
const mockGameState = {
  isPlaying: true,
  totalDamageDealt: 0,
  totalCurrencyEarned: 0,
  wave: 0,
  researchPoints: 0,
} as any;

describe('useWaveManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('initializes with preparing phase', () => {
    const { result } = renderHook(() =>
      useWaveManager(mockGameState, mockSetEnemies, mockSetGameState, mockPathWaypoints),
    );

    expect(result.current.waveState.phase).toBe('preparing');
    expect(result.current.waveState.wave).toBe(0);
  });

  it('transitions to spawning phase after timer', () => {
    const { result } = renderHook(() =>
      useWaveManager(mockGameState, mockSetEnemies, mockSetGameState, mockPathWaypoints),
    );

    // Simulate time passing (5 seconds prep time)
    act(() => {
      // We need to call updateWave manually as useFrame is not called in tests unless mocked/simulated
      // But useWaveManager takes delta in updateWave
      // Let's call updateWave(1.0, []) 6 times to be safe
      for (let i = 0; i < 6; i++) {
        result.current.updateWave(1.0, []);
      }
    });

    expect(result.current.waveState.phase).toBe('spawning');
    expect(result.current.waveState.wave).toBe(1);
    expect(mockSetGameState).toHaveBeenCalled(); // Should update global wave count
  });

  it('spawns enemies during spawning phase', () => {
    const { result } = renderHook(() =>
      useWaveManager(mockGameState, mockSetEnemies, mockSetGameState, mockPathWaypoints),
    );

    // Fast forward to spawning
    act(() => {
      for (let i = 0; i < 6; i++) {
        result.current.updateWave(1.0, []);
      }
    });

    // Now in spawning phase
    // Check if enemies are spawned
    act(() => {
      // Interval is around 1-2s
      result.current.updateWave(2.0, []);
    });

    expect(mockSetEnemies).toHaveBeenCalled();
  });
});
