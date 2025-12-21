import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';

import { applyEnginePatch, createInitialEngineState } from '../../game/engine/state';
import { createInitialUiState } from '../../game/engine/uiReducer';
import { GameProvider, useGame } from '../../game/GameState';
import {
  CHECKPOINT_STORAGE_KEY_V1,
  migrateSave,
  loadCheckpoint,
  serializeCheckpoint,
} from '../../game/persistence';
import { TileType, TowerType } from '../../types';

describe('persistence (Tier-B checkpoint)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrateSave rejects non-object payloads', () => {
    const result = migrateSave('nope');
    expect(result.ok).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('migrateSave drops unknown tower types and invalid tiles with warnings', () => {
    const result = migrateSave({
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      ui: {
        currentMapIndex: 0,
        money: 100,
        lives: 20,
        totalEarned: 0,
        totalSpent: 0,
        researchPoints: 0,
        upgrades: {},
      },
      checkpoint: {
        waveToStart: 1,
        towers: [
          { type: 'NOT_A_TOWER', level: 1, x: 0, z: 0 },
          // (0,1) is known non-grass on the default MAP_1 (spawn)
          { type: TowerType.Basic, level: 1, x: 0, z: 1 },
          { type: TowerType.Basic, level: 1, x: 0, z: 0 },
        ],
      },
    });

    expect(result.ok).toBe(true);
    expect(result.save?.checkpoint.towers).toHaveLength(1);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('autosaves once per WaveStarted (wave 1 included)', async () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.startGame();
    });

    act(() => {
      // Place a tower before the first wave starts so it is included in checkpoint.
      result.current.placeTower(0, 0, TowerType.Basic);
    });

    expect(result.current.towers).toHaveLength(1);

    // Advance time past the prep countdown to trigger WaveStarted(1).
    act(() => {
      result.current.step(5.1, 5.1);
    });

    await waitFor(() => {
      const raw = localStorage.getItem(CHECKPOINT_STORAGE_KEY_V1);
      expect(raw).toBeTruthy();
    });

    const saved = loadCheckpoint();
    expect(saved?.schemaVersion).toBe(1);
    expect(saved?.checkpoint.waveToStart).toBe(1);
    expect(saved?.checkpoint.towers.length).toBe(1);
  });

  it('resetCheckpoint reloads the last checkpoint and restores economy + towers', async () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
    });

    const moneyAfterFirstTower = result.current.gameState.money;

    act(() => {
      result.current.step(5.1, 5.1);
    });

    await waitFor(() => {
      expect(loadCheckpoint()).not.toBeNull();
    });

    // Mutate state away from checkpoint.
    const secondSpot = (() => {
      for (let z = 0; z < result.current.mapGrid.length; z++) {
        for (let x = 0; x < result.current.mapGrid[0].length; x++) {
          if (x === 0 && z === 0) continue;
          if (
            result.current.mapGrid[z]![x] === TileType.Grass &&
            result.current.isValidPlacement(x, z)
          ) {
            return { x, z };
          }
        }
      }
      return null;
    })();

    expect(secondSpot).not.toBeNull();

    act(() => {
      result.current.placeTower(secondSpot!.x, secondSpot!.z, TowerType.Basic);
    });
    expect(result.current.towers.length).toBe(2);

    act(() => {
      const res = result.current.resetCheckpoint();
      expect(res.ok).toBe(true);
    });

    expect(result.current.towers.length).toBe(1);
    expect(result.current.gameState.money).toBe(moneyAfterFirstTower);
  });

  it('factoryReset preserves graphics quality while wiping progress/meta', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.setGraphicsQuality('low');
      result.current.startGame();
    });

    act(() => {
      result.current.factoryReset();
    });

    expect(result.current.gameState.gameStatus).toBe('idle');
    expect(result.current.gameState.graphicsQuality).toBe('low');
  });

  it('serializeCheckpoint produces a stable v1 payload', () => {
    const ui = createInitialUiState();
    const engine = applyEnginePatch(createInitialEngineState(), {
      towers: [
        {
          id: 'tower-1',
          type: TowerType.Basic,
          level: 1,
          gridPosition: [0, 0],
          lastFired: 0,
        },
      ],
    });

    const save = serializeCheckpoint(ui, engine);
    expect(save.schemaVersion).toBe(1);
    expect(save.ui.money).toBeGreaterThanOrEqual(0);
    expect(save.checkpoint.waveToStart).toBeGreaterThanOrEqual(1);
    expect(save.checkpoint.towers).toHaveLength(1);
  });
});
