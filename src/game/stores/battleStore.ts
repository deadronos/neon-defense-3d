import type { StoreApi } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { createInitialEngineState } from '../engine/state';
import type { EngineState } from '../engine/types';

import { battleReducer, createInitialRuntimeState } from './runtimeReducer';
import type { BattleAction, RuntimeState } from './runtimeReducer';

export interface BattleStoreState {
  runtime: RuntimeState;
  engine: EngineState;
  dispatch: (action: BattleAction) => void;
}

export const createBattleStore = (): StoreApi<BattleStoreState> =>
  createStore<BattleStoreState>((set) => ({
    runtime: createInitialRuntimeState(),
    engine: createInitialEngineState(),
    dispatch: (action) =>
      set((state) => {
        const nextRuntime = battleReducer(state.runtime, action);
        return {
          runtime: nextRuntime,
          engine: nextRuntime.engine,
        };
      }),
  }));
