import { useCallback } from 'react';

import { MAP_LAYOUTS, TILE_SIZE, TOWER_CONFIGS, generatePath } from '../../constants';
import type { GraphicsQuality, TargetingMode, TowerType, UpgradeType } from '../../types';
import { TileType } from '../../types';
import { gridKey } from '../../utils/gridKey';
import { createInitialEngineState } from '../engine/state';
import { uiReducer } from '../engine/uiReducer';
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
import { calculateTowerRefundValue, getTowerStats } from '../utils';

type PlaySfx = (id: string) => void;

interface UseGameActionsParams {
  getRuntime: () => RuntimeStoreState['runtime'];
  dispatch: RuntimeStoreState['dispatch'];
  renderStateRef: RenderStateStoreState['renderStateRef'];
  mapGrid: TileType[][];
  enemyTypeMap: ReturnType<typeof buildEnemyTypeMap>;
  playSFX: PlaySfx;
}

// eslint-disable-next-line max-lines-per-function
export const useGameActions = ({
  getRuntime,
  dispatch,
  renderStateRef,
  mapGrid,
  enemyTypeMap,
  playSFX,
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
      const { ui } = getRuntime();
      if (ui.gameStatus !== 'playing') return;
      if (ui.currentMapIndex < 0 && !ui.customMapLayout) return;
      if (!isValidPlacement(x, z) || ui.money < TOWER_CONFIGS[type].cost) {
        playSFX('error');
        return;
      }
      playSFX('build');
      dispatch({ type: 'placeTower', x, z, towerType: type });
      dispatch({ type: 'uiAction', action: { type: 'setSelectedTower', tower: null } });
    },
    [dispatch, isValidPlacement, playSFX, getRuntime],
  );

  const setTowerTargetingMode = useCallback(
    (id: string, mode: TargetingMode) => dispatch({ type: 'setTowerTargetingMode', id, mode }),
    [dispatch],
  );

  const upgradeTower = useCallback(
    (id: string) => {
      // Check if affordable? Logic is in reducer.
      // We'll optimistically play sound or check state here.
      const state = getRuntime();
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
    [dispatch, playSFX, getRuntime],
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
    playSFX('click');
    dispatch({ type: 'uiAction', action: { type: 'startGame' } });
    dispatch({ type: 'resetEngine' });
  }, [dispatch, playSFX]);

  const resetGame = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'resetGame' } });
    dispatch({ type: 'resetEngine' });
  }, [dispatch]);

  const applyCheckpointSave = useCallback(
    (save: SaveV1) => {
      const snapshot = getRuntime();
      const next = buildRuntimeFromCheckpoint(save, snapshot.ui);
      dispatch({ type: 'setRuntimeState', engine: next.engine, ui: next.ui });

      // Immediately sync render state so gridOccupancy is up-to-date for placement checks.
      // Without this, tower hover/placement would be broken until the first game tick.
      const nextMapLayout =
        next.ui.currentMapIndex < 0
          ? (next.ui.customMapLayout ?? MAP_LAYOUTS[0])
          : MAP_LAYOUTS[next.ui.currentMapIndex % MAP_LAYOUTS.length];
      const nextPathWaypoints = generatePath(nextMapLayout);
      syncRenderState(next.engine, renderStateRef.current, {
        enemyTypeMap,
        pathWaypoints: nextPathWaypoints,
        tileSize: TILE_SIZE,
      });
    },
    [dispatch, enemyTypeMap, renderStateRef, getRuntime],
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
    const snapshot = getRuntime();
    const live = serializeCheckpoint(snapshot.ui, snapshot.engine);
    return { json: JSON.stringify(live, null, 2), hasCheckpoint: false };
  }, [getRuntime]);

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
      if (tower !== null) playSFX('click');
      dispatch({ type: 'uiAction', action: { type: 'setSelectedTower', tower } });
    },
    [dispatch, playSFX],
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
    [dispatch],
  );

  const removeEffect = useCallback(
    (id: string) => {
      dispatch({ type: 'removeEffect', effectId: id });
      const renderState = renderStateRef.current;
      renderState.effects = renderState.effects.filter((effect) => effect.id !== id);
    },
    [dispatch, renderStateRef],
  );

  const startRogueliteRun = useCallback(
    (seed: string) => {
      dispatch({ type: 'uiAction', action: { type: 'startRogueliteRun', seed } });
      dispatch({ type: 'resetEngine' });
    },
    [dispatch],
  );

  const nextRoguePhase = useCallback(
    (seed: string, layout?: number[][]) => {
      const { engine, ui } = getRuntime();
      const towers = engine.towers;
      let refund = 0;
      for (const t of towers) {
        refund += calculateTowerRefundValue(t.type as TowerType, t.level);
      }

      const nextEngine = createInitialEngineState();
      dispatch({
        type: 'setRuntimeState',
        engine: nextEngine,
        ui: uiReducer(
          { ...ui, money: ui.money + refund },
          { type: 'nextRoguePhase', seed, layout: layout ?? null },
        ),
      });
      syncRenderState(nextEngine, renderStateRef.current, {
        enemyTypeMap,
        pathWaypoints: generatePath(layout ?? MAP_LAYOUTS[0]),
        tileSize: TILE_SIZE,
      });
    },
    [dispatch, enemyTypeMap, getRuntime, renderStateRef],
  );

  const clearAnnouncement = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'setAnnouncement', announcement: null } });
  }, [dispatch]);

  return {
    isValidPlacement,
    placeTower,
    upgradeTower,
    setTowerTargetingMode,
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
