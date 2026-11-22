import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import type { PropsWithChildren } from 'react';
import { expect, it, vi } from 'vitest';

import { INITIAL_MAP_LAYOUT, MAP_HEIGHT, MAP_WIDTH } from '../../constants';
import { createInitialEngineState } from '../../game/engine/state';
import { createInitialUiState } from '../../game/engine/uiReducer';
import { useGame } from '../../game/gameContexts';
import { GameProvider } from '../../game/GameState';
import { loadCheckpoint, saveCheckpoint, serializeCheckpoint } from '../../game/persistence';
import { RogueliteManager } from '../../game/RogueliteManager';
import { generateProceduralMap } from '../../game/wfc/generateMap';
import { wfcClient } from '../../game/wfc/WFCClient';
import { TowerType } from '../../types';

vi.mock('../../game/audio/useAudio', () => ({ useAudio: () => ({ playSFX: vi.fn() }) }));

const Wrapper = ({ children }: PropsWithChildren) => (
  <StrictMode>
    <GameProvider>
      <RogueliteManager />
      {children}
    </GameProvider>
  </StrictMode>
);

it('restores Roguelite Wave 10 and advances to Phase 2 with a new map and refund', async () => {
  const nextMap = generateProceduralMap('phase-2', MAP_WIDTH, MAP_HEIGHT);
  const generate = vi.spyOn(wfcClient, 'generateMap').mockResolvedValue(nextMap);
  try {
    const { result } = renderHook(() => useGame(), { wrapper: Wrapper });
    const checkpoint = serializeCheckpoint(
      {
        ...createInitialUiState(),
        currentMapIndex: -1,
        customMapLayout: INITIAL_MAP_LAYOUT,
        customMapSeed: 'run',
        gameMode: 'ROGUELITE',
        lives: 100,
        wave: 10,
      },
      createInitialEngineState(),
    );
    checkpoint.checkpoint.towers.push({ type: TowerType.Basic, level: 1, x: 0, z: 0 });
    act(() => result.current.applyCheckpointSave(checkpoint));
    expect(result.current.towers).toHaveLength(1);
    expect(result.current.gameState.customMapLayout).toEqual(INITIAL_MAP_LAYOUT);

    act(() => result.current.step(5, 5));
    expect(result.current.gameState.wave).toBe(10);
    act(() => result.current.step(100, 105));
    act(() => result.current.step(100, 205));
    act(() => result.current.step(0.1, 205.1));

    await waitFor(() => expect(result.current.gameState.roguePhase).toBe(2));
    expect(generate).toHaveBeenCalledWith('run-2', MAP_WIDTH, MAP_HEIGHT);
    expect(result.current.gameState).toMatchObject({
      gameStatus: 'playing',
      wave: 1,
      money: 185,
      customMapLayout: nextMap,
      customMapSeed: 'run-2',
      totalDamageDealt: 0,
      totalCurrencyEarned: 0,
    });
    expect(result.current.towers).toHaveLength(0);

    act(() => result.current.step(5, 210.1));
    expect(loadCheckpoint()?.ui.roguePhase).toBe(2);
    expect(loadCheckpoint()?.checkpoint.waveToStart).toBe(1);
  } finally {
    generate.mockRestore();
  }
});

it('overwrites a previous Wave 1 autosave once for each new run', () => {
  saveCheckpoint(
    serializeCheckpoint({ ...createInitialUiState(), money: 500 }, createInitialEngineState()),
  );
  const write = vi.spyOn(Storage.prototype, 'setItem');
  try {
    const { result } = renderHook(() => useGame(), { wrapper: Wrapper });
    act(() => result.current.startGame());
    act(() => result.current.step(5, 5));
    expect(loadCheckpoint()?.ui.money).toBe(150);
    expect(write).toHaveBeenCalledTimes(1);

    act(() => result.current.startGame());
    act(() => result.current.placeTower(0, 0, TowerType.Basic));
    act(() => result.current.step(5, 10));
    expect(loadCheckpoint()?.ui.money).toBe(100);
    expect(write).toHaveBeenCalledTimes(2);
  } finally {
    write.mockRestore();
  }
});
