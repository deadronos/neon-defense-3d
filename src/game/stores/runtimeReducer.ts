import { TOWER_CONFIGS } from '../../constants';
import type { TowerType, Vector2 } from '../../types';
import { applyEngineRuntimeAction } from '../engine/runtime';
import type { EngineRuntimeAction, EngineRuntimeState } from '../engine/runtime';
import { allocateId, applyEnginePatch, createInitialEngineState } from '../engine/state';
import type { EngineState } from '../engine/types';
import { createInitialUiState, uiReducer } from '../engine/uiReducer';
import type { UiState } from '../engine/uiReducer';
import { calculateSynergies } from '../synergies';
import { getTowerStats } from '../utils';

export interface RuntimeState extends EngineRuntimeState {
  engine: EngineState;
  ui: UiState;
}

export type RuntimeAction =
  | EngineRuntimeAction
  | { type: 'resetEngine' }
  | { type: 'engineSetState'; engine: EngineState }
  | { type: 'setRuntimeState'; engine: EngineState; ui: UiState }
  | { type: 'factoryReset' }
  | { type: 'placeTower'; x: number; z: number; towerType: TowerType }
  | { type: 'upgradeTower'; id: string }
  | { type: 'sellTower'; id: string };

export const runtimeReducer = (state: RuntimeState, action: RuntimeAction): RuntimeState => {
  switch (action.type) {
    case 'resetEngine':
      return { ...state, engine: createInitialEngineState() };
    case 'engineSetState':
      return { ...state, engine: action.engine };
    case 'setRuntimeState':
      return { engine: action.engine, ui: action.ui };
    case 'factoryReset':
      return {
        engine: createInitialEngineState(),
        ui: uiReducer(state.ui, { type: 'factoryReset' }),
      };
    case 'placeTower': {
      const config = TOWER_CONFIGS[action.towerType];
      if (state.ui.money < config.cost) return state;

      const { id, state: afterId } = allocateId(state.engine, 'tower');
      const nextTower = {
        id,
        type: action.towerType,
        level: 1,
        gridPosition: [action.x, action.z] as Vector2,
        lastFired: 0,
      };

      const newTowers = [...state.engine.towers, nextTower];
      const synergies = calculateSynergies(newTowers);
      const synergedTowers = newTowers.map((t) => ({
        ...t,
        activeSynergies: synergies.get(t.id),
      }));

      return {
        engine: applyEnginePatch(afterId, { towers: synergedTowers }),
        ui: uiReducer(state.ui, { type: 'spendMoney', amount: config.cost }),
      };
    }
    case 'upgradeTower': {
      const tower = state.engine.towers.find((t) => t.id === action.id);
      if (!tower) return state;
      const stats = getTowerStats(tower.type as TowerType, tower.level, {
        upgrades: state.ui.upgrades,
        activeSynergies: tower.activeSynergies,
      });
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
      const refund = Math.floor(config.cost * 0.7);

      const filteredTowers = state.engine.towers.filter((t) => t.id !== action.id);
      const synergies = calculateSynergies(filteredTowers);
      const synergedTowers = filteredTowers.map((t) => ({
        ...t,
        activeSynergies: synergies.get(t.id),
      }));

      return {
        engine: applyEnginePatch(state.engine, {
          towers: synergedTowers,
        }),
        ui: { ...state.ui, money: state.ui.money + refund, selectedEntityId: null },
      };
    }
    default:
      return applyEngineRuntimeAction(state, action);
  }
};

export const createInitialRuntimeState = (): RuntimeState => ({
  engine: createInitialEngineState(),
  ui: createInitialUiState(),
});
