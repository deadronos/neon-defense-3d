import { UpgradeType } from '../../types';
import type { GraphicsQuality, TowerType } from '../../types';
import { getResearchCost, MAX_RESEARCH_LEVEL } from '../utils';

import type { EngineEvent } from './events';

export const MAX_LIVES = 20;

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
  /**
   * Incremented whenever a major state change (like loading a save) requires
   * a full remount of the game scene components.
   */
  sessionNonce: number;
  announcement: {
    text: string;
    subtext?: string;
    id: number;
  } | null;
  // Procedural
  gameMode: 'CLASSIC' | 'ROGUELITE';
  roguePhase: number;
  roguePhaseCompleted: boolean;
  customMapSeed: string | null;
  customMapLayout: number[][] | null;
}

export type UiAction =
  | { type: 'startGame' }
  | { type: 'resetGame' }
  | { type: 'factoryReset' }
  | { type: 'startNextSector' }
  | { type: 'purchaseUpgrade'; upgrade: UpgradeType; cost: number }
  | { type: 'spendMoney'; amount: number }
  | { type: 'grantMoney'; amount: number }
  | { type: 'setGameStatus'; gameStatus: UiState['gameStatus'] }
  | { type: 'setGraphicsQuality'; quality: GraphicsQuality }
  | { type: 'setSelectedTower'; tower: TowerType | null }
  | { type: 'setSelectedEntity'; id: string | null }
  | { type: 'applyEngineEvents'; events: EngineEvent[] }
  | { type: 'setAnnouncement'; announcement: UiState['announcement'] }
  | { type: 'setGameMode'; mode: 'CLASSIC' | 'ROGUELITE' }
  | { type: 'startRogueliteRun'; seed: string }
  | { type: 'nextRoguePhase'; seed: string; layout: number[][] | null }
  | { type: 'setCustomMapLayout'; layout: number[][] };

export const createInitialUiState = (): UiState => ({
  money: 150,
  lives: MAX_LIVES,
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
  sessionNonce: 0,
  announcement: null,
  gameMode: 'CLASSIC',
  roguePhase: 1,
  roguePhaseCompleted: false,
  customMapSeed: null,
  customMapLayout: null,
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
        if (state.gameMode === 'ROGUELITE') return { ...state, roguePhaseCompleted: true };
        const earnedRP =
          3 +
          Math.min(5, Math.floor(state.totalDamageDealt / 5000 + state.totalCurrencyEarned / 2500));
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

const startingMoney = (state: UiState) =>
  Math.floor(150 * (1 + (state.upgrades[UpgradeType.GLOBAL_GREED] ?? 0) * 0.05));

// eslint-disable-next-line complexity
export const uiReducer = (state: UiState, action: UiAction): UiState => {
  switch (action.type) {
    case 'startGame':
      return {
        ...state,
        gameMode: 'CLASSIC',
        roguePhase: 1,
        roguePhaseCompleted: false,
        customMapSeed: null,
        customMapLayout: null,
        sessionNonce: state.sessionNonce + 1,
        gameStatus: 'playing',
        lives: MAX_LIVES,
        money: startingMoney(state),
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
        lives: MAX_LIVES,
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
        sessionNonce: state.sessionNonce + 1,
      };
    case 'startNextSector': {
      return {
        ...state,
        currentMapIndex: state.currentMapIndex + 1,
        sessionNonce: state.sessionNonce + 1,
        money: startingMoney(state),
        lives: MAX_LIVES,
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
      const currentLevel = state.upgrades[action.upgrade] ?? 0;
      const cost = getResearchCost(currentLevel);
      if (currentLevel >= MAX_RESEARCH_LEVEL || state.researchPoints < cost) return state;
      return {
        ...state,
        researchPoints: state.researchPoints - cost,
        upgrades: {
          ...state.upgrades,
          [action.upgrade]: currentLevel + 1,
        },
      };
    }
    case 'spendMoney':
      return { ...state, money: Math.max(0, state.money - action.amount) };
    case 'grantMoney':
      return { ...state, money: state.money + action.amount };
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
    case 'setAnnouncement':
      return { ...state, announcement: action.announcement };
    case 'setGameMode':
      return { ...state, gameMode: action.mode };
    case 'startRogueliteRun':
      return {
        ...state,
        gameMode: 'ROGUELITE',
        gameStatus: 'playing',
        lives: MAX_LIVES,
        money: startingMoney(state),
        wave: 1,
        roguePhase: 1,
        roguePhaseCompleted: false,
        customMapLayout: null,
        sessionNonce: state.sessionNonce + 1,
        waveStartedNonce: 0,
        lastWaveStartedWave: 0,
        currentMapIndex: -1, // -1 signals procedural
        customMapSeed: action.seed,
        totalDamageDealt: 0,
        totalCurrencyEarned: 0,
        selectedEntityId: null,
        selectedTower: null,
      };
    case 'nextRoguePhase':
      return {
        ...state,
        roguePhase: state.roguePhase + 1,
        wave: 1,
        waveStartedNonce: 0,
        lastWaveStartedWave: 0,
        totalDamageDealt: 0,
        totalCurrencyEarned: 0,
        selectedEntityId: null,
        selectedTower: null,
        announcement: null,
        roguePhaseCompleted: false,
        customMapSeed: action.seed,
        customMapLayout: action.layout,
        sessionNonce: state.sessionNonce + 1,
        gameStatus: 'playing',
      };
    case 'setCustomMapLayout':
      return { ...state, customMapLayout: action.layout };
    default:
      return state;
  }
};
