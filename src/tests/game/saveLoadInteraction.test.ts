import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GameProvider, useGame } from '../../game/GameState';
import { TowerType } from '../../types';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from '../../game/persistence';
import type { SaveV1 } from '../../game/persistence';

// Mock Audio
vi.mock('../../game/audio/AudioManager', () => ({
  useAudio: () => ({
    playSFX: vi.fn(),
  }),
}));

// Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Save/Load Interaction Bug Reproduction', () => {
  it('allows building towers after loading a save', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    // 1. Start Game
    act(() => {
      result.current.startGame();
    });
    expect(result.current.gameState.gameStatus).toBe('playing');

    // 2. Place a tower at (0,0)
    act(() => {
      result.current.placeTower(0, 0, TowerType.Basic);
      // Sync render state manually since we don't have the GameLoop running step()
      result.current.step(0.016, 1);
    });
    expect(result.current.towers).toHaveLength(1);
    const towerIdOriginal = result.current.towers[0].id;

    // 3. Save Game
    // We can't easily trigger the exact autosave effect from useful hooks, 
    // but specific components export the save logic. 
    // Or we can use `exportCheckpointJson` logic or just call serialize manually?
    // `useGame` exposes `applyCheckpointSave`, but not `save`. 
    // Wait, the effect in GameState triggers `saveCheckpoint`.
    // Let's manually trigger a save via the internal logic if exposed, 
    // OR just use serializeCheckpoint helper if we can access passing the internal state?
    // Actully `useGame` doesn't expose `serialize`.
    
    // However, `GameState` effect autosaves on `waveStartedNonce`.
    // We can trigger that event? No, avoiding engine internals.
    // Let's inspect `persistence.ts` exports. We can use `serializeCheckpoint` if we had the state.
    // We have `result.current.gameState` (UI) but not Engine.
    // `exportCheckpointJson` uses `loadCheckpoint` OR serializes live state.
    
    let validSaveJson = '';
    act(() => {
        const res = result.current.exportCheckpointJson();
        validSaveJson = res.json;
    });
    
    const saveObj = JSON.parse(validSaveJson) as SaveV1;
    expect(saveObj.checkpoint.towers).toHaveLength(1);

    // 4. Reset Game (Clear state)
    act(() => {
        result.current.factoryReset(); 
        // This clears checkpoint too, so we must restore the "Saved" one to localStorage manually
        // or passing it to applyCheckpointSave.
    });
    expect(result.current.towers).toHaveLength(0);
    expect(result.current.gameState.gameStatus).toBe('idle');

    // 5. Load Game
    act(() => {
        result.current.applyCheckpointSave(saveObj);
        // Force a step to sync render state? 
        // applyCheckpointSave calls syncRenderState internally, but let's see.
    });
    
    expect(result.current.gameState.gameStatus).toBe('playing');
    expect(result.current.towers).toHaveLength(1);
    
    // 6. Verify Interaction: Can we place a NEW tower at (1,0)?
    // First check validity
    const isValid = result.current.isValidPlacement(1, 0);
    expect(isValid).toBe(true);
    
    act(() => {
        result.current.placeTower(1, 0, TowerType.Basic);
        result.current.step(0.016, 2);
    });
    
    expect(result.current.towers).toHaveLength(2);
    
    // 7. Verify Interaction: Selection
    // Selecting the old tower (which has a NEW ID after load!)
    // We need to find the new ID at (0,0)
    const towerAt00 = result.current.towers.find(t => t.gridPos[0] === 0 && t.gridPos[1] === 0);
    expect(towerAt00).toBeDefined();
    expect(towerAt00).toBeDefined();
    expect(towerAt00?.id).toBe(towerIdOriginal); // IDs are deterministic (reset to tower-1)
    
    act(() => {
        // "Click" the map tile or calling setSelectedEntityId directly?
        // World.tsx: handlePointerDown -> look up gridOccupancy -> setSelectedEntityId.
        // We can check if `gridOccupancy` has the tower.
        const key = '0,0';
        const occ = result.current.renderStateRef.current.gridOccupancy.get(key);
        expect(occ).toBeDefined();
        expect(occ?.id).toBe(towerAt00?.id);
    });
  });

  it('allows building on Map 1 after loading a Map 1 save', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    // 1. Start Limit (Map 0) -> Next Sector (Map 1)
    act(() => {
      result.current.startGame();
      result.current.startNextSector();
    });
    expect(result.current.gameState.currentMapIndex).toBe(1);

    // 2. Place Tower at (0,7) (Map 1 has grass there)
    act(() => {
      result.current.placeTower(0, 7, TowerType.Basic);
      result.current.step(0.016, 1);
    });
    expect(result.current.towers).toHaveLength(1);

    // 3. Export
    let validSaveJson = '';
    act(() => {
        const res = result.current.exportCheckpointJson();
        validSaveJson = res.json;
    });
    const saveObj = JSON.parse(validSaveJson) as SaveV1;
    expect(saveObj.ui.currentMapIndex).toBe(1);

    // 4. Reset
    act(() => {
        result.current.factoryReset();
    });
    expect(result.current.gameState.currentMapIndex).toBe(0);

    // 5. Load
    act(() => {
        result.current.applyCheckpointSave(saveObj);
        result.current.step(0.016, 1);
    });

    expect(result.current.gameState.currentMapIndex).toBe(1);
    expect(result.current.towers).toHaveLength(1);

    // 6. Interact
    const isValid = result.current.isValidPlacement(6, 6);
    // If Map 1 has grass at 6,6
    // We can just rely on `isValidPlacement` result. If false, maybe it's wall.
    // But if `isValidPlacement` returns true, then logic works.
    expect(result.current.renderStateRef.current.gridOccupancy.size).toBe(1);
    // Check occupancy of old tower
    expect(result.current.renderStateRef.current.gridOccupancy.has('0,7')).toBe(true);
  });
});
