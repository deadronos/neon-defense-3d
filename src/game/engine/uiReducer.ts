import { UpgradeType } from '../../types';
import type { GraphicsQuality, TowerType } from '../../types';

import type { EngineEvent } from './events';

export interface UiState {
  money: number;
  lives: number;
  wave: number;
  /** Monotonic marker incremented only when a WaveStarted engine event is applied. */
  waveStartedNonce: number;
  /** Last wave number observed in a WaveStarted engine event (diagnostic). */
  lastWaveStartedWave: number;
  gameStatus: 'idle' | 'playing' | 'gameover' | 'victory';
  selectedEntityId: string | null;
  selectedTower: TowerType | null;
  currentMapIndex: number;
  researchPoints: number;
  totalDamageDealt: number;
  totalCurrencyEarned: number;
  graphicsQuality: GraphicsQuality;
  upgrades: {
    [key in UpgradeType]?: number;
  };
}

export type UiAction =
  | { type: 'startGame' }
  | { type: 'resetGame' }
  | { type: 'factoryReset' }
  | { type: 'startNextSector' }
  | { type: 'purchaseUpgrade'; upgrade: UpgradeType; cost: number }
  | { type: 'spendMoney'; amount: number }
  | { type: 'setGameStatus'; gameStatus: UiState['gameStatus'] }
  | { type: 'setGraphicsQuality'; quality: GraphicsQuality }
  | { type: 'setSelectedTower'; tower: TowerType | null }
  | { type: 'setSelectedEntity'; id: string | null }
  | { type: 'applyEngineEvents'; events: EngineEvent[] };

export const createInitialUiState = (): UiState => ({
  money: 150,
  lives: 20,
  wave: 1,
  waveStartedNonce: 0,
  lastWaveStartedWave: 0,
  gameStatus: 'idle',
  selectedEntityId: null,
  selectedTower: null,
  currentMapIndex: 0,
  researchPoints: 0,
  totalDamageDealt: 0,
  totalCurrencyEarned: 0,
  graphicsQuality: 'high',
  upgrades: {},
});

const reduceEngineEvent = (state: UiState, event: EngineEvent): UiState => {
  switch (event.type) {
    case 'MoneyAwarded':
      return { ...state, money: state.money + event.amount };
    case 'LivesLost': {
      const lives = Math.max(0, state.lives - event.amount);
      return {
        ...state,
        lives,
        gameStatus: lives <= 0 ? 'gameover' : state.gameStatus,
      };
    }
    case 'DamageDealt':
      return { ...state, totalDamageDealt: state.totalDamageDealt + event.amount };
    case 'WaveStarted':
      return {
        ...state,
        wave: event.wave,
        lastWaveStartedWave: event.wave,
        waveStartedNonce: state.waveStartedNonce + 1,
      };
    case 'WaveCompleted': {
      if (event.wave > 0 && event.wave % 10 === 0 && state.gameStatus === 'playing') {
        const earnedRP = Math.floor(state.totalDamageDealt / 200 + state.totalCurrencyEarned / 100);
        return {
          ...state,
          gameStatus: 'victory',
          researchPoints: state.researchPoints + earnedRP,
        };
      }
      return state;
    }
    case 'EnemyKilled':
      return {
        ...state,
        money: state.money + event.reward,
        totalCurrencyEarned: state.totalCurrencyEarned + event.reward,
      };
    default:
      return state;
  }
};

export const uiReducer = (state: UiState, action: UiAction): UiState => {
  switch (action.type) {
    case 'startGame':
      return {
        ...state,
        gameStatus: 'playing',
        lives: 20,
        money: 150,
        wave: 1,
        waveStartedNonce: 0,
        lastWaveStartedWave: 0,
        currentMapIndex: 0,
        totalDamageDealt: 0,
        totalCurrencyEarned: 0,
        selectedEntityId: null,
        selectedTower: null,
      };
    case 'resetGame':
      return {
        ...state,
        gameStatus: 'idle',
        lives: 20,
        money: 150,
        wave: 1,
        waveStartedNonce: 0,
        lastWaveStartedWave: 0,
        currentMapIndex: 0,
        totalDamageDealt: 0,
        totalCurrencyEarned: 0,
        selectedEntityId: null,
        selectedTower: null,
      };
    case 'factoryReset':
      return {
        ...createInitialUiState(),
        graphicsQuality: state.graphicsQuality,
      };
    case 'startNextSector': {
      const greedLevel = state.upgrades?.[UpgradeType.GLOBAL_GREED] || 0;
      const startMoney = 150 * (1 + greedLevel * 0.05);
      return {
        ...state,
        currentMapIndex: state.currentMapIndex + 1,
        money: startMoney,
        wave: 1,
        waveStartedNonce: 0,
        lastWaveStartedWave: 0,
        gameStatus: 'playing',
        totalDamageDealt: 0,
        totalCurrencyEarned: 0,
        selectedEntityId: null,
        selectedTower: null,
      };
    }
    case 'purchaseUpgrade': {
      if (state.researchPoints < action.cost) return state;
      const currentLevel = state.upgrades[action.upgrade] || 0;
      return {
        ...state,
        researchPoints: state.researchPoints - action.cost,
        upgrades: {
          ...state.upgrades,
          [action.upgrade]: currentLevel + 1,
        },
      };
    }
    case 'spendMoney':
      return { ...state, money: Math.max(0, state.money - action.amount) };
    case 'setGameStatus':
      return { ...state, gameStatus: action.gameStatus };
    case 'setGraphicsQuality':
      return { ...state, graphicsQuality: action.quality };
    case 'setSelectedTower':
      return { ...state, selectedTower: action.tower };
    case 'setSelectedEntity':
      return { ...state, selectedEntityId: action.id };
    case 'applyEngineEvents':
      return action.events.reduce(reduceEngineEvent, state);
    default:
      return state;
  }
};
