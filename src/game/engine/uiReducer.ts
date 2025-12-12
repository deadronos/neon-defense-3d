import type { EngineEvent } from './events';

import { UpgradeType } from '../../types';
import type { TowerType } from '../../types';

export interface UiState {
  money: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  gameStatus: 'idle' | 'playing' | 'gameover' | 'victory';
  selectedEntityId: string | null;
  selectedTower: TowerType | null;
  currentMapIndex: number;
  researchPoints: number;
  totalDamageDealt: number;
  totalCurrencyEarned: number;
  upgrades: {
    [key in UpgradeType]?: number;
  };
}

export type UiAction =
  | { type: 'startGame' }
  | { type: 'resetGame' }
  | { type: 'startNextSector' }
  | { type: 'purchaseUpgrade'; upgrade: UpgradeType; cost: number }
  | { type: 'spendMoney'; amount: number }
  | { type: 'setPlaying'; isPlaying: boolean }
  | { type: 'setGameStatus'; gameStatus: UiState['gameStatus'] }
  | { type: 'setSelectedTower'; tower: TowerType | null }
  | { type: 'setSelectedEntity'; id: string | null }
  | { type: 'applyEngineEvents'; events: EngineEvent[] };

export const createInitialUiState = (): UiState => ({
  money: 150,
  lives: 20,
  wave: 1,
  isPlaying: false,
  gameStatus: 'idle',
  selectedEntityId: null,
  selectedTower: null,
  currentMapIndex: 0,
  researchPoints: 0,
  totalDamageDealt: 0,
  totalCurrencyEarned: 0,
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
        isPlaying: lives <= 0 ? false : state.isPlaying,
      };
    }
    case 'DamageDealt':
      return { ...state, totalDamageDealt: state.totalDamageDealt + event.amount };
    case 'WaveStarted':
      return { ...state, wave: event.wave };
    case 'WaveCompleted': {
      if (event.wave > 0 && event.wave % 10 === 0 && state.gameStatus === 'playing') {
        const earnedRP = Math.floor(state.totalDamageDealt / 200 + state.totalCurrencyEarned / 100);
        return {
          ...state,
          gameStatus: 'victory',
          isPlaying: false,
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
        isPlaying: true,
        gameStatus: 'playing',
        lives: 20,
        money: 150,
        wave: 1,
        currentMapIndex: 0,
        researchPoints: 0,
        totalDamageDealt: 0,
        totalCurrencyEarned: 0,
        upgrades: {},
        selectedEntityId: null,
        selectedTower: null,
      };
    case 'resetGame':
      return {
        ...state,
        isPlaying: false,
        gameStatus: 'idle',
        lives: 20,
        money: 150,
        wave: 1,
        currentMapIndex: 0,
        researchPoints: 0,
        totalDamageDealt: 0,
        totalCurrencyEarned: 0,
        upgrades: {},
        selectedEntityId: null,
        selectedTower: null,
      };
    case 'startNextSector': {
      const greedLevel = state.upgrades?.[UpgradeType.GLOBAL_GREED] || 0;
      const startMoney = 150 * (1 + greedLevel * 0.05);
      return {
        ...state,
        currentMapIndex: state.currentMapIndex + 1,
        money: startMoney,
        wave: 1,
        gameStatus: 'playing',
        isPlaying: true,
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
    case 'setPlaying':
      return { ...state, isPlaying: action.isPlaying };
    case 'setGameStatus':
      return { ...state, gameStatus: action.gameStatus };
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
