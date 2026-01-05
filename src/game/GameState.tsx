import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { StoreApi } from 'zustand';
import { useStore } from 'zustand';

import { MAP_LAYOUTS, TILE_SIZE, generatePath, getMapGrid } from '../constants';
import type { GameState, GraphicsQuality, TowerType } from '../types';
import { TileType, UpgradeType } from '../types';

import { useAudio } from './audio/AudioManager';
import type {
  GameContextProps,
  GameUiContextProps,
  RenderStateContextProps,
  WorldContextProps,
} from './contextTypes';
import { writeEnemyWorldPosition } from './engine/selectors';
import { stepEngine } from './engine/step';
import type { EngineCache } from './engine/step';
import type { EngineEnemy, EngineVector2 } from './engine/types';
import type { SaveV1 } from './persistence';
import {
  buildRuntimeFromCheckpoint,
  clearCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
  serializeCheckpoint,
} from './persistence';
import { syncRenderState } from './renderStateUtils';
import { createGameSpeedStore } from './stores/gameSpeedStore';
import type { GameSpeedStoreState } from './stores/gameSpeedStore';
import { createRenderStateStore } from './stores/renderStateStore';
import type { RenderStateStoreState } from './stores/renderStateStore';
import { createRuntimeStore } from './stores/runtimeStore';
import type { RuntimeStoreState } from './stores/runtimeStore';
import {
  buildEnemyTypeMap,
  toEffectEntity,
  toEnemyEntity,
  toProjectileEntity,
  toTowerEntity,
  toWaveState,
} from './transforms';
import { getTowerStats } from './utils';

const ensureStoreRef = <T,>(factory: () => StoreApi<T>, ref: { current: StoreApi<T> | null }) => {
  if (!ref.current) {
    ref.current = factory();
  }
  return ref.current;
};

/** Context for managing game state. */
const GameContext = createContext<GameContextProps | undefined>(undefined);
const GameUiContext = createContext<GameUiContextProps | undefined>(undefined);
const RenderStateContext = createContext<RenderStateContextProps | undefined>(undefined);
const WorldContext = createContext<WorldContextProps | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

export const useGameUi = () => {
  const context = useContext(GameUiContext);
  if (!context) throw new Error('useGameUi must be used within GameProvider');
  return context;
};

export const useRenderState = () => {
  const context = useContext(RenderStateContext);
  if (!context) throw new Error('useRenderState must be used within GameProvider');
  return context.renderStateRef;
};

export const useWorld = () => {
  const context = useContext(WorldContext);
  if (!context) throw new Error('useWorld must be used within GameProvider');
  return context;
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { playSFX } = useAudio();
  const enemyTypeMap = useMemo(buildEnemyTypeMap, []);

  const runtimeStoreRef = useRef<StoreApi<RuntimeStoreState> | null>(null);
  const renderStateStoreRef = useRef<StoreApi<RenderStateStoreState> | null>(null);
  const gameSpeedStoreRef = useRef<StoreApi<GameSpeedStoreState> | null>(null);

  const runtimeStore = ensureStoreRef(createRuntimeStore, runtimeStoreRef);
  const renderStateStore = ensureStoreRef(createRenderStateStore, renderStateStoreRef);
  const gameSpeedStore = ensureStoreRef(createGameSpeedStore, gameSpeedStoreRef);

  const runtime = useStore(runtimeStore, (state) => state.runtime);
  const dispatch = useStore(runtimeStore, (state) => state.dispatch);
  const renderStateRef = useStore(renderStateStore, (state) => state.renderStateRef);
  const gameSpeed = useStore(gameSpeedStore, (state) => state.gameSpeed);
  const setGameSpeed = useStore(gameSpeedStore, (state) => state.setGameSpeed);

  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  const lastAutosavedNonceRef = useRef<number>(-1);

  // Autosave a Tier-B checkpoint once per WaveStarted event.
  useEffect(() => {
    const nonce = runtime.ui.waveStartedNonce;
    if (nonce === lastAutosavedNonceRef.current) return;
    lastAutosavedNonceRef.current = nonce;

    // Only autosave on WaveStarted events (nonce > 0) during active play.
    if (nonce <= 0) return;
    if (runtime.ui.gameStatus !== 'playing') return;

    const snapshot = runtimeRef.current;
    const nextSave = serializeCheckpoint(snapshot.ui, snapshot.engine);

    // Dev StrictMode can double-run effects; skip duplicate writes for the same wave.
    const existing = loadCheckpoint();
    if (
      existing &&
      existing.checkpoint.waveToStart === nextSave.checkpoint.waveToStart &&
      existing.ui.currentMapIndex === nextSave.ui.currentMapIndex
    ) {
      return;
    }

    saveCheckpoint(nextSave);
  }, [runtime.ui.waveStartedNonce, runtime.ui.gameStatus]);

  const engineCacheRef = useRef<EngineCache>({
    projectileHits: new Map(),
    projectileFreeze: new Map(),
    activeProjectiles: [],
    enemiesById: new Map(),
    enemyPositions: new Map(),
    enemyPositionPool: [],
    nextEnemies: [],
    pathSegmentLengths: [],
    scratchEnemyPos: [0, 0, 0],
  });

  const currentMapLayout = MAP_LAYOUTS[runtime.ui.currentMapIndex % MAP_LAYOUTS.length];
  const mapGrid = useMemo(() => getMapGrid(currentMapLayout), [currentMapLayout]);
  const pathWaypoints = useMemo(() => generatePath(currentMapLayout), [currentMapLayout]);

  const enginePathWaypoints: readonly EngineVector2[] = pathWaypoints;

  const enemies = useMemo(
    () =>
      runtime.engine.enemies.map((enemy) =>
        toEnemyEntity(enemy, enemyTypeMap, enginePathWaypoints),
      ),
    [runtime.engine.enemies, enemyTypeMap, enginePathWaypoints],
  );

  const enemiesById = useMemo(() => {
    const map = new Map<string, EngineEnemy>();
    for (const enemy of runtime.engine.enemies) {
      map.set(enemy.id, enemy);
    }
    return map;
  }, [runtime.engine.enemies]);

  const towers = useMemo(
    () => runtime.engine.towers.map((tower) => toTowerEntity(tower)),
    [runtime.engine.towers],
  );

  const projectiles = useMemo(
    () =>
      runtime.engine.projectiles.map((projectile) =>
        toProjectileEntity(projectile, enemiesById, enginePathWaypoints),
      ),
    [runtime.engine.projectiles, enemiesById, enginePathWaypoints],
  );

  const effects = useMemo(
    () => runtime.engine.effects.map((effect) => toEffectEntity(effect)),
    [runtime.engine.effects],
  );

  const waveState = useMemo(() => toWaveState(runtime.engine.wave), [runtime.engine.wave]);

  const isValidPlacement = useCallback(
    (x: number, z: number) => {
      if (x < 0 || x >= mapGrid[0].length || z < 0 || z >= mapGrid.length) return false;
      if (mapGrid[z][x] !== TileType.Grass) return false;

      // Use the cached O(1) grid occupancy map from renderState
      const key = `${x},${z}`;
      if (renderStateRef.current.gridOccupancy.has(key)) return false;

      return true;
    },
    [mapGrid],
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
    [isValidPlacement, playSFX],
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
    [playSFX],
  );

  const sellTower = useCallback(
    (id: string) => {
      playSFX('sell');
      dispatch({ type: 'sellTower', id });
    },
    [playSFX],
  );
  const skipWave = useCallback(() => dispatch({ type: 'skipWave' }), []);

  const startGame = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'startGame' } });
    dispatch({ type: 'resetEngine' });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'resetGame' } });
    dispatch({ type: 'resetEngine' });
  }, []);

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
    [enemyTypeMap],
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
  }, []);

  const exportCheckpointJson = useCallback((): { json: string; hasCheckpoint: boolean } => {
    const checkpoint = loadCheckpoint();
    if (checkpoint) return { json: JSON.stringify(checkpoint, null, 2), hasCheckpoint: true };
    const snapshot = runtimeRef.current;
    const live = serializeCheckpoint(snapshot.ui, snapshot.engine);
    return { json: JSON.stringify(live, null, 2), hasCheckpoint: false };
  }, []);

  const startNextSector = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'startNextSector' } });
    dispatch({ type: 'resetEngine' });
  }, []);

  const purchaseUpgrade = useCallback((type: UpgradeType, cost: number) => {
    dispatch({ type: 'uiAction', action: { type: 'purchaseUpgrade', upgrade: type, cost } });
  }, []);

  const setGraphicsQuality = useCallback((quality: GraphicsQuality) => {
    dispatch({ type: 'uiAction', action: { type: 'setGraphicsQuality', quality } });
  }, []);

  const setSelectedTower = useCallback((tower: TowerType | null) => {
    dispatch({ type: 'uiAction', action: { type: 'setSelectedTower', tower } });
  }, []);

  const setSelectedEntityId = useCallback((id: string | null) => {
    dispatch({ type: 'uiAction', action: { type: 'setSelectedEntity', id } });
  }, []);

  const removeEffect = useCallback(
    (id: string) => dispatch({ type: 'removeEffect', effectId: id }),
    [],
  );

  const killStreakRef = useRef({ count: 0, lastTime: 0 });

  const step = useCallback(
    (deltaSeconds: number, nowSeconds: number) => {
      const snapshot = runtimeRef.current;
      if (snapshot.ui.gameStatus !== 'playing') return;

      const deltaMs = deltaSeconds * 1000 * gameSpeed;
      const nowMs = nowSeconds * 1000;
      const greedLevel = snapshot.ui.upgrades?.[UpgradeType.GLOBAL_GREED] || 0;
      const greedMultiplier = 1 + greedLevel * 0.05;

      const result = stepEngine(
        snapshot.engine,
        enginePathWaypoints,
        { deltaMs, nowMs, rng: Math.random },
        { tileSize: TILE_SIZE, greedMultiplier, upgrades: snapshot.ui.upgrades },
        engineCacheRef.current,
      );

      // --- Sync Engine State to Mutable Render State ---
      syncRenderState(result.state, renderStateRef.current, {
        enemyTypeMap,
        pathWaypoints: enginePathWaypoints,
        tileSize: TILE_SIZE,
      });

      // Process engine events for Audio
      if (result.events.immediate.length > 0 || result.events.deferred.length > 0) {
        const allEvents = [...result.events.immediate, ...result.events.deferred];
        // We can batch play sounds or just play them.
        // To avoid spamming, we might want to throttle shoot/impact sounds.
        // But for now, let's just detect "DamageDealt" for impact, and "EffectSpawned" (explosion)

        // Wait, 'DamageDealt' is aggregated per frame.
        // 'EffectSpawned' is per effect.

        // Check for projectile creation?
        // stepEngine result.patch.projectiles might be set.
        // But checking diff is expensive.
        // Let's rely on EngineEvents.
        // stepTowers doesn't emit 'ProjectileFired' event yet.

        // We should add 'ProjectileFired' event to stepTowers if we want audio for it.
        // For now, let's look at EffectSpawned (explosions/impacts usually create effects or just damage).

        // Kill Streak Logic
        let killsThisTick = 0;
        allEvents.forEach((e) => {
          if (e.type === 'EffectSpawned') {
            playSFX('impact');
          } else if (e.type === 'ProjectileFired') {
            playSFX('shoot');
          } else if (e.type === 'EnemyKilled') {
            killsThisTick++;
          }
        });

        if (killsThisTick > 0) {
          const streakState = killStreakRef.current;
          const timeSinceLast = nowSeconds - streakState.lastTime;

          if (timeSinceLast < 1.5) {
            streakState.count += killsThisTick;
          } else {
            streakState.count = killsThisTick;
          }
          streakState.lastTime = nowSeconds;

          let announcementText = '';
          let subtext = '';

          // Determine announcement
          // Simple thresholds for now
          if (streakState.count === 2) {
            announcementText = 'DOUBLE KILL';
          } else if (streakState.count === 3) {
            announcementText = 'TRIPLE KILL';
          } else if (streakState.count === 4) {
            announcementText = 'QUADRA KILL';
          } else if (streakState.count === 5) {
            announcementText = 'PENTA KILL';
          } else if (streakState.count > 5) {
            announcementText = 'RAMPAGE';
            subtext = `${streakState.count} KILLS!`;
          }

          if (announcementText) {
            dispatch({
              type: 'uiAction',
              action: {
                type: 'setAnnouncement',
                announcement: {
                  text: announcementText,
                  subtext,
                  id: Date.now(),
                },
              },
            });
          }
        }
      }

      // Heuristic for shooting sound:
      // If new projectiles were added in this tick.
      // result.patch.projectiles is the NEW list if changed.
      // But we don't know if it grew.
      // A better way is to update `stepTowers` to emit events.
      // For now, I will modify stepTowers to emit 'ProjectileFired'.

      dispatch({ type: 'applyTickResult', result });
    },
    [enginePathWaypoints, gameSpeed, playSFX],
  );

  const gameState: GameState = {
    ...runtime.ui,
    isPlaying: runtime.ui.gameStatus === 'playing',
  };

  const clearAnnouncement = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'setAnnouncement', announcement: null } });
  }, []);

  const gameContextValue = useMemo(
    () => ({
      gameState,
      enemies,
      towers,
      projectiles,
      effects,
      waveState: waveState ?? null,
      step,
      removeEffect,
      placeTower,
      startGame,
      resetGame,
      selectedTower: runtime.ui.selectedTower,
      setSelectedTower,
      selectedEntityId: runtime.ui.selectedEntityId,
      setSelectedEntityId,
      upgradeTower,
      sellTower,
      isValidPlacement,
      mapGrid,
      pathWaypoints,
      startNextSector,
      purchaseUpgrade,
      setGraphicsQuality,
      resetCheckpoint,
      factoryReset,
      applyCheckpointSave,
      exportCheckpointJson,
      skipWave,
      gameSpeed,
      setGameSpeed,
      renderStateRef,
      clearAnnouncement,
    }),
    [
      gameState,
      enemies,
      towers,
      projectiles,
      effects,
      waveState,
      step,
      removeEffect,
      placeTower,
      startGame,
      resetGame,
      runtime.ui.selectedTower,
      setSelectedTower,
      runtime.ui.selectedEntityId,
      setSelectedEntityId,
      upgradeTower,
      sellTower,
      isValidPlacement,
      mapGrid,
      pathWaypoints,
      startNextSector,
      purchaseUpgrade,
      setGraphicsQuality,
      resetCheckpoint,
      factoryReset,
      applyCheckpointSave,
      exportCheckpointJson,
      skipWave,
      gameSpeed,
      setGameSpeed,
      renderStateRef,
      clearAnnouncement,
    ],
  );

  const gameUiValue = useMemo(
    () => ({
      gameState,
      waveState: waveState ?? null,
      step,
      removeEffect,
      placeTower,
      startGame,
      resetGame,
      selectedTower: runtime.ui.selectedTower,
      setSelectedTower,
      selectedEntityId: runtime.ui.selectedEntityId,
      setSelectedEntityId,
      upgradeTower,
      sellTower,
      startNextSector,
      purchaseUpgrade,
      setGraphicsQuality,
      resetCheckpoint,
      factoryReset,
      applyCheckpointSave,
      exportCheckpointJson,
      skipWave,
      gameSpeed,
      setGameSpeed,
      clearAnnouncement,
    }),
    [
      gameState,
      waveState,
      step,
      removeEffect,
      placeTower,
      startGame,
      resetGame,
      runtime.ui.selectedTower,
      setSelectedTower,
      runtime.ui.selectedEntityId,
      setSelectedEntityId,
      upgradeTower,
      sellTower,
      startNextSector,
      purchaseUpgrade,
      setGraphicsQuality,
      resetCheckpoint,
      factoryReset,
      applyCheckpointSave,
      exportCheckpointJson,
      skipWave,
      gameSpeed,
      setGameSpeed,
      clearAnnouncement,
    ],
  );

  const renderStateValue = useMemo(() => ({ renderStateRef }), []);

  const worldValue = useMemo(
    () => ({
      mapGrid,
      currentMapIndex: runtime.ui.currentMapIndex,
      placeTower,
      isValidPlacement,
      selectedTower: runtime.ui.selectedTower,
      gameStatus: runtime.ui.gameStatus,
      setSelectedEntityId,
      renderStateRef,
    }),
    [
      mapGrid,
      runtime.ui.currentMapIndex,
      placeTower,
      isValidPlacement,
      runtime.ui.selectedTower,
      runtime.ui.gameStatus,
      setSelectedEntityId,
      renderStateRef,
    ],
  );

  return (
    <GameContext.Provider value={gameContextValue}>
      <GameUiContext.Provider value={gameUiValue}>
        <RenderStateContext.Provider value={renderStateValue}>
          <WorldContext.Provider value={worldValue}>{children}</WorldContext.Provider>
        </RenderStateContext.Provider>
      </GameUiContext.Provider>
    </GameContext.Provider>
  );
};
