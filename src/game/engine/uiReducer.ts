import type { EngineEvent } from './events';

export interface UiState {
  money: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  gameStatus: 'idle' | 'playing' | 'gameover' | 'victory';
  selectedEntityId: string | null;
  researchPoints: number;
}

export type UiAction =
  | { type: 'setPlaying'; isPlaying: boolean }
  | { type: 'setGameStatus'; gameStatus: UiState['gameStatus'] }
  | { type: 'setSelectedEntity'; id: string | null }
  | { type: 'advanceWave'; wave: number }
  | { type: 'applyEngineEvents'; events: EngineEvent[] };

export const createInitialUiState = (): UiState => ({
  money: 0,
  lives: 20,
  wave: 0,
  isPlaying: false,
  gameStatus: 'idle',
  selectedEntityId: null,
  researchPoints: 0,
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
    case 'WaveStarted':
      return { ...state, wave: event.wave };
    case 'EnemyKilled':
      return { ...state, money: state.money + event.reward };
    default:
      return state;
  }
};

export const uiReducer = (state: UiState, action: UiAction): UiState => {
  switch (action.type) {
    case 'setPlaying':
      return { ...state, isPlaying: action.isPlaying };
    case 'setGameStatus':
      return { ...state, gameStatus: action.gameStatus };
    case 'setSelectedEntity':
      return { ...state, selectedEntityId: action.id };
    case 'advanceWave':
      return { ...state, wave: action.wave };
    case 'applyEngineEvents':
      return action.events.reduce(reduceEngineEvent, state);
    default:
      return state;
  }
};
