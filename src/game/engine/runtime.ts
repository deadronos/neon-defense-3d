import { engineReducer } from './state';
import type { EngineTickResult } from './types';
import type { EngineState } from './types';
import type { UiState, UiAction } from './uiReducer';
import { uiReducer } from './uiReducer';

export interface EngineRuntimeState {
  engine: EngineState;
  ui: UiState;
}

export type EngineRuntimeAction =
  | { type: 'applyTickResult'; result: EngineTickResult }
  | { type: 'removeEffect'; effectId: string }
  | { type: 'skipWave' }
  | { type: 'uiAction'; action: UiAction };

export const applyEngineRuntimeAction = (
  state: EngineRuntimeState,
  action: EngineRuntimeAction,
): EngineRuntimeState => {
  switch (action.type) {
    case 'applyTickResult': {
      const { state: nextEngine, immediateEvents } = engineReducer(state.engine, action);
      const nextUi = uiReducer(state.ui, { type: 'applyEngineEvents', events: immediateEvents });
      return { engine: nextEngine, ui: nextUi };
    }
    case 'removeEffect': {
      const { state: nextEngine } = engineReducer(state.engine, action);
      return { engine: nextEngine, ui: state.ui };
    }
    case 'skipWave': {
      if (state.engine.wave && state.engine.wave.phase === 'preparing') {
        return {
          ...state,
          engine: {
            ...state.engine,
            wave: { ...state.engine.wave, timerMs: 0 },
          },
        };
      }
      return state;
    }
    case 'uiAction':
      return { engine: state.engine, ui: uiReducer(state.ui, action.action) };
    default:
      return state;
  }
};
