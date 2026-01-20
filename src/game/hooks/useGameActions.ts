import { useCallback } from 'react';
import type { MutableRefObject } from 'react';

import { MAP_LAYOUTS, TILE_SIZE, generatePath } from '../../constants';
import type { GraphicsQuality, TowerType, UpgradeType } from '../../types';
import { TileType } from '../../types';
import { gridKey } from '../../utils/gridKey';
import {
  buildRuntimeFromCheckpoint,
  clearCheckpoint,
  loadCheckpoint,
  serializeCheckpoint,
} from '../persistence';
import type { SaveV1 } from '../persistence';
import { syncRenderState } from '../renderStateUtils';
import type { RenderStateStoreState } from '../stores/renderStateStore';
import type { RuntimeStoreState } from '../stores/runtimeStore';
import type { buildEnemyTypeMap } from '../transforms';
import { getTowerStats } from '../utils';

type PlaySfx = (id: string) => void;

interface UseGameActionsParams {
  runtimeRef: MutableRefObject<RuntimeStoreState['runtime']>;
  dispatch: RuntimeStoreState['dispatch'];
  renderStateRef: RenderStateStoreState['renderStateRef'];
  mapGrid: TileType[][];
  enemyTypeMap: ReturnType<typeof buildEnemyTypeMap>;
  playSFX: PlaySfx;
  lastAutosavedNonceRef: MutableRefObject<number>;
}

// eslint-disable-next-line max-lines-per-function
export const useGameActions = ({
  runtimeRef,
  dispatch,
  renderStateRef,
  mapGrid,
  enemyTypeMap,
  playSFX,
  lastAutosavedNonceRef,
}: UseGameActionsParams) => {
  const isValidPlacement = useCallback(
    (x: number, z: number) => {
      if (x < 0 || x >= mapGrid[0].length || z < 0 || z >= mapGrid.length) return false;
      if (mapGrid[z][x] !== TileType.Grass) return false;

      // Use the cached O(1) grid occupancy map from renderState
      const key = gridKey(x, z);
      if (renderStateRef.current.gridOccupancy.has(key)) return false;

      return true;
    },
    [mapGrid, renderStateRef],
  );

  const placeTower = useCallback(
    (x: number, z: number, type: TowerType) => {
      if (runtimeRef.current.ui.gameStatus !== 'playing') return;
      if (!isValidPlacement(x, z)) {
        playSFX('error');
        return;
      }
      playSFX('build');
      dispatch({ type: 'placeTower', x, z, towerType: type });
      dispatch({ type: 'uiAction', action: { type: 'setSelectedTower', tower: null } });
    },
    [dispatch, isValidPlacement, playSFX, runtimeRef],
  );

  const upgradeTower = useCallback(
    (id: string) => {
      // Check if affordable? Logic is in reducer.
      // We'll optimistically play sound or check state here.
      const state = runtimeRef.current;
      const tower = state.engine.towers.find((t) => t.id === id);
      if (tower) {
        const stats = getTowerStats(tower.type as TowerType, tower.level, {
          upgrades: state.ui.upgrades,
          activeSynergies: tower.activeSynergies,
        });
        if (state.ui.money >= stats.upgradeCost) {
          playSFX('build'); // Reuse build sound for upgrade
        } else {
          playSFX('error');
        }
      }
      dispatch({ type: 'upgradeTower', id });
    },
    [dispatch, playSFX, runtimeRef],
  );

  const sellTower = useCallback(
    (id: string) => {
      playSFX('sell');
      dispatch({ type: 'sellTower', id });
    },
    [dispatch, playSFX],
  );

  const skipWave = useCallback(() => dispatch({ type: 'skipWave' }), [dispatch]);

  const startGame = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'startGame' } });
    dispatch({ type: 'resetEngine' });
  }, [dispatch]);

  const resetGame = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'resetGame' } });
    dispatch({ type: 'resetEngine' });
  }, [dispatch]);

  const applyCheckpointSave = useCallback(
    (save: SaveV1) => {
      const snapshot = runtimeRef.current;
      const next = buildRuntimeFromCheckpoint(save, snapshot.ui);
      // Reset autosave tracking so wave 1 (or any future wave) can autosave again after restore.
      lastAutosavedNonceRef.current = -1;
      dispatch({ type: 'setRuntimeState', engine: next.engine, ui: next.ui });

      // Immediately sync render state so gridOccupancy is up-to-date for placement checks.
      // Without this, tower hover/placement would be broken until the first game tick.
      const nextMapLayout = MAP_LAYOUTS[next.ui.currentMapIndex % MAP_LAYOUTS.length];
      const nextPathWaypoints = generatePath(nextMapLayout);
      syncRenderState(next.engine, renderStateRef.current, {
        enemyTypeMap,
        pathWaypoints: nextPathWaypoints,
        tileSize: TILE_SIZE,
      });
    },
    [dispatch, enemyTypeMap, lastAutosavedNonceRef, renderStateRef, runtimeRef],
  );

  const resetCheckpoint = useCallback((): { ok: boolean; error?: string } => {
    const checkpoint = loadCheckpoint();
    if (!checkpoint) return { ok: false, error: 'No checkpoint found.' };
    applyCheckpointSave(checkpoint);
    return { ok: true };
  }, [applyCheckpointSave]);

  const factoryReset = useCallback(() => {
    clearCheckpoint();
    dispatch({ type: 'factoryReset' });
  }, [dispatch]);

  const exportCheckpointJson = useCallback((): { json: string; hasCheckpoint: boolean } => {
    const checkpoint = loadCheckpoint();
    if (checkpoint) return { json: JSON.stringify(checkpoint, null, 2), hasCheckpoint: true };
    const snapshot = runtimeRef.current;
    const live = serializeCheckpoint(snapshot.ui, snapshot.engine);
    return { json: JSON.stringify(live, null, 2), hasCheckpoint: false };
  }, [runtimeRef]);

  const startNextSector = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'startNextSector' } });
    dispatch({ type: 'resetEngine' });
  }, [dispatch]);

  const purchaseUpgrade = useCallback(
    (type: UpgradeType, cost: number) => {
      dispatch({ type: 'uiAction', action: { type: 'purchaseUpgrade', upgrade: type, cost } });
    },
    [dispatch],
  );

  const setGraphicsQuality = useCallback(
    (quality: GraphicsQuality) => {
      dispatch({ type: 'uiAction', action: { type: 'setGraphicsQuality', quality } });
    },
    [dispatch],
  );

  const setSelectedTower = useCallback(
    (tower: TowerType | null) => {
      dispatch({ type: 'uiAction', action: { type: 'setSelectedTower', tower } });
    },
    [dispatch],
  );

  const setSelectedEntityId = useCallback(
    (id: string | null) => {
      dispatch({ type: 'uiAction', action: { type: 'setSelectedEntity', id } });
    },
    [dispatch],
  );

  const setCustomMapLayout = useCallback(
    (layout: number[][]) => {
        dispatch({ type: 'uiAction', action: { type: 'setCustomMapLayout', layout } });
    },
    [dispatch]
  );

  const removeEffect = useCallback(
    (id: string) => dispatch({ type: 'removeEffect', effectId: id }),
    [dispatch],
  );

  const startRogueliteRun = useCallback((seed: string) => {
    dispatch({ type: 'uiAction', action: { type: 'startRogueliteRun', seed } });
    dispatch({ type: 'resetEngine' });
  }, [dispatch]);

  const nextRoguePhase = useCallback((seed: string) => {
    // Phase Transition:
    // 1. Maintain Money/Lives/Upgrades (handled by Reducer)
    // 2. Clear Board (resetEngine)
    // 3. Update Phase/Seed (Reducer)
    // 4. Refund Towers? (Already verified: we should refund generic value or just let player keep money)
    //    Ideally, before resetting engine, we sum up tower costs and add to money.
    //    Since resetEngine wipes everything, we need a custom "SellAllAndStartNextPhase" action?
    //    Or we just assume "Warp" auto-sells everything.
    //    Current implementation: We must dispatch a 'sellAll' or compute value first.
    //    Let's iterate towers in runtimeRef to compute refund.

    const towers = runtimeRef.current.engine.towers;
    let refund = 0;
    for (const t of towers) {
       // Simple refund calculation: cost
       // Or rely on stats cost cache.
       // Let's assume average cost or metadata.
       // actually, tower entity doesn't store cost, but config does.
       const stats = getTowerStats(t.type as TowerType, t.level, { upgrades: runtimeRef.current.ui.upgrades });
       // Refund: Current Value.
       refund += stats.cost; // Base cost roughly.
       // For exactness we might need cumulative cost.
       // For MVP Roguelite: Refund 75% or 100% of BASE cost.
    }

    if (refund > 0) {
       dispatch({type: 'uiAction', action: { type: 'spendMoney', amount: -refund } }); // Negative spend = Refund
    }

    dispatch({ type: 'uiAction', action: { type: 'nextRoguePhase', seed } });
    dispatch({ type: 'resetEngine' });
  }, [dispatch, runtimeRef]);

  const clearAnnouncement = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'setAnnouncement', announcement: null } });
  }, [dispatch]);

  return {
    isValidPlacement,
    placeTower,
    upgradeTower,
    sellTower,
    skipWave,
    startGame,
    resetGame,
    applyCheckpointSave,
    resetCheckpoint,
    factoryReset,
    exportCheckpointJson,
    startNextSector,
    purchaseUpgrade,
    setGraphicsQuality,
    setSelectedTower,
    setSelectedEntityId,
    removeEffect,
    clearAnnouncement,
    startRogueliteRun,
    nextRoguePhase,
    setCustomMapLayout,
  };
};
