import type { EngineTickResult } from './types';
import type { UiState, UiAction } from './uiReducer';
import { engineReducer } from './state';
import { uiReducer } from './uiReducer';
import type { EngineState } from './types';

export interface EngineRuntimeState {
  engine: EngineState;
  ui: UiState;
}

export type EngineRuntimeAction =
  | { type: 'applyTickResult'; result: EngineTickResult }
  | { type: 'removeEffect'; effectId: string }
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
    case 'uiAction':
      return { engine: state.engine, ui: uiReducer(state.ui, action.action) };
    default:
      return state;
  }
};
