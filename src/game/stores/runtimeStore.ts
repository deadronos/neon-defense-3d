import type { StoreApi } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { createInitialRuntimeState, runtimeReducer } from './runtimeReducer';
import type { RuntimeAction, RuntimeState } from './runtimeReducer';

export interface RuntimeStoreState {
  runtime: RuntimeState;
  dispatch: (action: RuntimeAction) => void;
}

export const createRuntimeStore = (): StoreApi<RuntimeStoreState> =>
  createStore<RuntimeStoreState>((set) => ({
    runtime: createInitialRuntimeState(),
    dispatch: (action) =>
      set((state) => ({
        runtime: runtimeReducer(state.runtime, action),
      })),
  }));
