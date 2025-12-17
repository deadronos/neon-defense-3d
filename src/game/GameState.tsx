import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import { Vector3 } from 'three';

import {
  ENEMY_TYPES,
  MAP_LAYOUTS,
  TILE_SIZE,
  TOWER_CONFIGS,
  generatePath,
  getMapGrid,
} from '../constants';
import type {
  EffectEntity,
  EnemyConfig,
  EnemyEntity,
  GameState,
  ProjectileEntity,
  TowerEntity,
  TowerType,
  Vector2,
  WaveState,
} from '../types';
import { TileType, UpgradeType } from '../types';

import type { GameContextProps } from './contextTypes';
import { applyEngineRuntimeAction } from './engine/runtime';
import { selectEnemyWorldPosition } from './engine/selectors';
import { allocateId, applyEnginePatch, createInitialEngineState } from './engine/state';
import { stepEngine } from './engine/step';
import type { EngineCache } from './engine/step';
import type { EngineEnemy, EngineState, EngineVector2 } from './engine/types';
import { createInitialUiState, uiReducer } from './engine/uiReducer';
import { getTowerStats } from './utils';

type EnemyTypeConfig = (typeof ENEMY_TYPES)[keyof typeof ENEMY_TYPES];

const buildEnemyTypeMap = () => {
  const map = new Map<string, EnemyTypeConfig>();
  for (const config of Object.values(ENEMY_TYPES)) {
    map.set(config.name, config);
  }
  return map;
};

const toWaveState = (engineWave: EngineState['wave']): WaveState | null => {
  if (!engineWave) return null;
  return {
    wave: engineWave.wave,
    phase: engineWave.phase,
    nextWaveTime: 0,
    enemiesAlive: engineWave.enemiesAlive,
    enemiesRemainingToSpawn: engineWave.enemiesRemainingToSpawn,
    timer: engineWave.timerMs / 1000,
  };
};

const toEnemyEntity = (
  enemy: EngineEnemy,
  enemyTypeMap: Map<string, EnemyTypeConfig>,
  pathWaypoints: readonly EngineVector2[],
): EnemyEntity => {
  const baseConfig = enemyTypeMap.get(enemy.type);
  const config: EnemyConfig = {
    speed: enemy.speed ?? baseConfig?.speed ?? 0,
    hp: enemy.hp,
    shield: enemy.shield ?? baseConfig?.shield ?? 0,
    reward: enemy.reward ?? baseConfig?.reward ?? 0,
    color: enemy.color ?? baseConfig?.color ?? '#ffffff',
    scale: enemy.scale ?? baseConfig?.scale,
    abilities: baseConfig?.abilities,
  };

  const [x, y, z] = selectEnemyWorldPosition(enemy, pathWaypoints, TILE_SIZE);

  return {
    id: enemy.id,
    config,
    pathIndex: enemy.pathIndex,
    progress: enemy.progress,
    position: new Vector3(x, y, z),
    hp: enemy.hp,
    shield: enemy.shield ?? 0,
    maxShield: enemy.maxShield ?? enemy.shield ?? 0,
    frozen: enemy.frozen ?? 0,
    abilityCooldown: enemy.abilityCooldown ?? 0,
    abilityActiveTimer: enemy.abilityActiveTimer ?? 0,
  };
};

const toProjectileEntity = (projectile: EngineState['projectiles'][number]): ProjectileEntity => ({
  id: projectile.id,
  startPos: new Vector3(projectile.origin[0], projectile.origin[1], projectile.origin[2]),
  targetId: projectile.targetId,
  speed: projectile.speed,
  progress: projectile.progress,
  damage: projectile.damage,
  color: projectile.color,
});

const toEffectEntity = (effect: EngineState['effects'][number]): EffectEntity => ({
  id: effect.id,
  type: effect.type,
  position: new Vector3(effect.position[0], effect.position[1], effect.position[2]),
  color: effect.color,
  scale: effect.scale,
  duration: effect.duration,
  createdAt: effect.createdAt,
});

const toTowerEntity = (tower: EngineState['towers'][number]): TowerEntity => ({
  id: tower.id,
  type: tower.type as TowerType,
  gridPos: [tower.gridPosition[0], tower.gridPosition[1]],
  position: new Vector3(tower.gridPosition[0] * TILE_SIZE, 0.5, tower.gridPosition[1] * TILE_SIZE),
  lastFired: tower.lastFired,
  targetId: tower.targetId ?? null,
  level: tower.level,
});

type RuntimeState = {
  engine: EngineState;
  ui: ReturnType<typeof createInitialUiState>;
};

type RuntimeAction =
  | Parameters<typeof applyEngineRuntimeAction>[1]
  | { type: 'resetEngine' }
  | { type: 'engineSetState'; engine: EngineState }
  | { type: 'placeTower'; x: number; z: number; towerType: TowerType }
  | { type: 'upgradeTower'; id: string }
  | { type: 'sellTower'; id: string };

const runtimeReducer = (state: RuntimeState, action: RuntimeAction): RuntimeState => {
  switch (action.type) {
    case 'resetEngine':
      return { ...state, engine: createInitialEngineState() };
    case 'engineSetState':
      return { ...state, engine: action.engine };
    case 'placeTower': {
      const config = TOWER_CONFIGS[action.towerType];
      if (!config || state.ui.money < config.cost) return state;

      const { id, state: afterId } = allocateId(state.engine, 'tower');
      const nextTower = {
        id,
        type: action.towerType,
        level: 1,
        gridPosition: [action.x, action.z] as Vector2,
        lastFired: 0,
      };

      return {
        engine: applyEnginePatch(afterId, { towers: [...afterId.towers, nextTower] }),
        ui: uiReducer(state.ui, { type: 'spendMoney', amount: config.cost }),
      };
    }
    case 'upgradeTower': {
      const tower = state.engine.towers.find((t) => t.id === action.id);
      if (!tower) return state;
      const stats = getTowerStats(tower.type as TowerType, tower.level, state.ui.upgrades);
      if (state.ui.money < stats.upgradeCost) return state;
      const nextTowers = state.engine.towers.map((t) =>
        t.id === action.id ? { ...t, level: t.level + 1 } : t,
      );
      return {
        engine: applyEnginePatch(state.engine, { towers: nextTowers }),
        ui: uiReducer(state.ui, { type: 'spendMoney', amount: stats.upgradeCost }),
      };
    }
    case 'sellTower': {
      const tower = state.engine.towers.find((t) => t.id === action.id);
      if (!tower) return state;
      const config = TOWER_CONFIGS[tower.type as TowerType];
      const refund = Math.floor((config?.cost ?? 0) * 0.7);
      return {
        engine: applyEnginePatch(state.engine, {
          towers: state.engine.towers.filter((t) => t.id !== action.id),
        }),
        ui: { ...state.ui, money: state.ui.money + refund, selectedEntityId: null },
      };
    }
    default:
      return applyEngineRuntimeAction(state, action);
  }
};

/** Context for managing game state. */
const GameContext = createContext<GameContextProps | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const enemyTypeMap = useMemo(buildEnemyTypeMap, []);

  const [runtime, dispatch] = useReducer(runtimeReducer, undefined, () => ({
    engine: createInitialEngineState(),
    ui: createInitialUiState(),
  }));

  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  const engineCacheRef = useRef<EngineCache>({
    projectileHits: new Map(),
    activeProjectiles: [],
    enemiesById: new Map(),
    nextEnemies: [],
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

  const towers = useMemo(
    () => runtime.engine.towers.map((tower) => toTowerEntity(tower)),
    [runtime.engine.towers],
  );

  const projectiles = useMemo(
    () => runtime.engine.projectiles.map((projectile) => toProjectileEntity(projectile)),
    [runtime.engine.projectiles],
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
      if (
        runtimeRef.current.engine.towers.some(
          (t) => t.gridPosition[0] === x && t.gridPosition[1] === z,
        )
      )
        return false;
      return true;
    },
    [mapGrid],
  );

  const placeTower = useCallback(
    (x: number, z: number, type: TowerType) => {
      if (runtimeRef.current.ui.gameStatus !== 'playing') return;
      if (!isValidPlacement(x, z)) return;
      dispatch({ type: 'placeTower', x, z, towerType: type });
      dispatch({ type: 'uiAction', action: { type: 'setSelectedTower', tower: null } });
    },
    [isValidPlacement],
  );

  const upgradeTower = useCallback((id: string) => dispatch({ type: 'upgradeTower', id }), []);
  const sellTower = useCallback((id: string) => dispatch({ type: 'sellTower', id }), []);

  const startGame = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'startGame' } });
    dispatch({ type: 'resetEngine' });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'resetGame' } });
    dispatch({ type: 'resetEngine' });
  }, []);

  const startNextSector = useCallback(() => {
    dispatch({ type: 'uiAction', action: { type: 'startNextSector' } });
    dispatch({ type: 'resetEngine' });
  }, []);

  const purchaseUpgrade = useCallback((type: UpgradeType, cost: number) => {
    dispatch({ type: 'uiAction', action: { type: 'purchaseUpgrade', upgrade: type, cost } });
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

  const step = useCallback(
    (deltaSeconds: number, nowSeconds: number) => {
      const snapshot = runtimeRef.current;
      if (snapshot.ui.gameStatus !== 'playing') return;

      const deltaMs = deltaSeconds * 1000;
      const nowMs = nowSeconds * 1000;
      const greedLevel = snapshot.ui.upgrades?.[UpgradeType.GLOBAL_GREED] || 0;
      const greedMultiplier = 1 + greedLevel * 0.05;

      const result = stepEngine(
        snapshot.engine,
        enginePathWaypoints,
        { deltaMs, nowMs, rng: Math.random },
        { tileSize: TILE_SIZE, greedMultiplier },
        engineCacheRef.current,
      );

      dispatch({ type: 'applyTickResult', result });
    },
    [enginePathWaypoints],
  );

  const gameState: GameState = {
    ...runtime.ui,
    isPlaying: runtime.ui.gameStatus === 'playing',
  };

  return (
    <GameContext.Provider
      value={{
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
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
