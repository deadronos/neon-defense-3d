import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

// Move mock to top to ensure it applies before imports that use it resolve
vi.mock('../../game/audio/AudioManager', () => ({
  useAudio: () => ({
    playSFX: vi.fn(),
  }),
}));

import { applyEnginePatch, createInitialEngineState } from '../../game/engine/state';
import { createInitialUiState } from '../../game/engine/uiReducer';
import { GameProvider, useGame } from '../../game/GameState';
import {
  CHECKPOINT_STORAGE_KEY_V1,
  buildRuntimeFromCheckpoint,
  migrateSave,
  loadCheckpoint,
  saveCheckpoint,
  serializeCheckpoint,
} from '../../game/persistence';
import { TileType, TowerType, UpgradeType } from '../../types';

describe('persistence (Tier-B checkpoint)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
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

  it('migrateSave clamps negative economy and drops unknown upgrades', () => {
    const result = migrateSave({
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      ui: {
        currentMapIndex: 0,
        money: -5,
        lives: -1,
        totalEarned: -10,
        totalSpent: -99,
        researchPoints: -2,
        upgrades: {
          [UpgradeType.GLOBAL_GREED]: -3,
          NOT_A_REAL_UPGRADE: 123,
        },
      },
      checkpoint: {
        waveToStart: 1,
        towers: [],
      },
    });

    expect(result.ok).toBe(true);
    expect(result.save?.ui.money).toBe(0);
    expect(result.save?.ui.lives).toBe(0);
    expect(result.save?.ui.totalEarned).toBe(0);
    expect(result.save?.ui.totalSpent).toBe(0);
    expect(result.save?.ui.researchPoints).toBe(0);
    expect(result.save?.ui.upgrades[UpgradeType.GLOBAL_GREED]).toBe(0);
    expect('NOT_A_REAL_UPGRADE' in (result.save?.ui.upgrades ?? {})).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('migrateSave drops duplicate tower positions', () => {
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
          { type: TowerType.Basic, level: 1, x: 0, z: 0 },
          { type: TowerType.Basic, level: 1, x: 0, z: 0 },
        ],
      },
    });

    expect(result.ok).toBe(true);
    expect(result.save?.checkpoint.towers).toHaveLength(1);
    expect(result.warnings.join('\n')).toMatch(/duplicate tower position/i);
  });

  it('saveCheckpoint returns ok=false when localStorage.setItem throws', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    const ui = createInitialUiState();
    const engine = createInitialEngineState();
    const save = serializeCheckpoint(ui, engine);

    const res = saveCheckpoint(save);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/quota/i);

    setItem.mockRestore();
  });

  it('loadCheckpoint returns null for invalid JSON or invalid payload', () => {
    localStorage.setItem(CHECKPOINT_STORAGE_KEY_V1, '{');
    expect(loadCheckpoint()).toBeNull();

    localStorage.setItem(
      CHECKPOINT_STORAGE_KEY_V1,
      JSON.stringify({ schemaVersion: 1, timestamp: new Date().toISOString() }),
    );
    expect(loadCheckpoint()).toBeNull();
  });

  it('buildRuntimeFromCheckpoint resets ephemeral UI markers and prepares wave correctly', () => {
    const previousUi = {
      ...createInitialUiState(),
      gameStatus: 'playing' as const,
      waveStartedNonce: 123,
      lastWaveStartedWave: 99,
      selectedEntityId: 'tower-xyz',
      selectedTower: TowerType.Basic,
    };

    const migrated = migrateSave({
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
        waveToStart: 3,
        towers: [{ type: TowerType.Basic, level: 2, x: 0, z: 0 }],
      },
    });

    expect(migrated.ok).toBe(true);
    const next = buildRuntimeFromCheckpoint(migrated.save!, previousUi);

    expect(next.ui.waveStartedNonce).toBe(0);
    expect(next.ui.lastWaveStartedWave).toBe(0);
    expect(next.ui.selectedEntityId).toBeNull();
    expect(next.ui.selectedTower).toBeNull();

    expect(next.ui.wave).toBe(3);
    expect(next.engine.wave?.phase).toBe('preparing');
    expect(next.engine.wave?.wave).toBe(2);
    expect(next.engine.towers).toHaveLength(1);
    expect(next.engine.towers[0]?.level).toBe(2);
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

  it('isValidPlacement respects towers from loaded checkpoint', async () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    // Start game and place a tower
    act(() => result.current.startGame());
    act(() => result.current.placeTower(0, 0, TowerType.Basic));

    // Advance time to trigger WaveStarted and autosave
    act(() => result.current.step(5.1, 5.1));

    await waitFor(() => {
      expect(loadCheckpoint()).not.toBeNull();
    });

    // Tower should exist and block placement at (0,0)
    expect(result.current.towers).toHaveLength(1);
    expect(result.current.isValidPlacement(0, 0)).toBe(false);

    // Sell the tower and tick to update gridOccupancy
    const towerId = result.current.towers[0]?.id;
    expect(towerId).toBeDefined();
    act(() => result.current.sellTower(towerId!));
    act(() => result.current.step(0.016, 5.116)); // trigger syncRenderState

    // Now (0,0) should be free
    expect(result.current.towers).toHaveLength(0);
    expect(result.current.isValidPlacement(0, 0)).toBe(true);

    // Load checkpoint - tower should block (0,0) again immediately
    act(() => {
      const res = result.current.resetCheckpoint();
      expect(res.ok).toBe(true);
    });

    // After reset, placement at (0,0) should be blocked by restored tower
    // This proves syncRenderState was called after applyCheckpointSave
    expect(result.current.towers).toHaveLength(1);
    expect(result.current.isValidPlacement(0, 0)).toBe(false);
  });
});
