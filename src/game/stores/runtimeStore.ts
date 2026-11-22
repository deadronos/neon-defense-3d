import type { StoreApi } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { createInitialRuntimeState, runtimeReducer } from './runtimeReducer';
import type { RuntimeAction, RuntimeState } from './runtimeReducer';

export interface RuntimeStoreState {
  runtime: RuntimeState;
  hudTowers: RuntimeState['engine']['towers'];
  dispatch: (action: RuntimeAction) => void;
}

export const createRuntimeStore = (): StoreApi<RuntimeStoreState> =>
  createStore<RuntimeStoreState>((set) => {
    const initial = createInitialRuntimeState();
    return {
      runtime: initial,
      hudTowers: initial.engine.towers,
      dispatch: (action) =>
        set((state) => {
          const runtime = runtimeReducer(state.runtime, action);
          return {
            runtime,
            // Ticks update targeting and cooldown. Tower layout changes through actions.
            hudTowers:
              action.type === 'applyTickResult' ||
              runtime.engine.towers === state.runtime.engine.towers
                ? state.hudTowers
                : runtime.engine.towers,
          };
        }),
    };
  });
