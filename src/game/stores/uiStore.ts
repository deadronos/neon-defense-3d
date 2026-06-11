import type { StoreApi } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { createInitialUiState } from '../engine/uiReducer';
import type { UiState } from '../engine/uiReducer';

import { createInitialRuntimeState, runtimeReducer } from './runtimeReducer';
import type { RuntimeAction, RuntimeState } from './runtimeReducer';

export interface UiStoreState {
  runtime: RuntimeState;
  ui: UiState;
  dispatch: (action: RuntimeAction) => void;
}

export const createUiStore = (): StoreApi<UiStoreState> =>
  createStore<UiStoreState>((set) => ({
    runtime: createInitialRuntimeState(),
    ui: createInitialUiState(),
    dispatch: (action) =>
      set((state) => {
        const nextRuntime = runtimeReducer(state.runtime, action);
        return {
          runtime: nextRuntime,
          ui: nextRuntime.ui,
        };
      }),
  }));
