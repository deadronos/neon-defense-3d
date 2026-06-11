import { useRef } from 'react';
import type { StoreApi } from 'zustand';
import { useStore } from 'zustand';

import { createBattleStore } from '../stores/battleStore';
import type { BattleStoreState } from '../stores/battleStore';
import { createGameSpeedStore } from '../stores/gameSpeedStore';
import type { GameSpeedStoreState } from '../stores/gameSpeedStore';
import { createRenderStateStore } from '../stores/renderStateStore';
import type { RenderStateStoreState } from '../stores/renderStateStore';
import type { RuntimeAction } from '../stores/runtimeReducer';
import { createRuntimeStore } from '../stores/runtimeStore';
import type { RuntimeStoreState } from '../stores/runtimeStore';
import { createUiStore } from '../stores/uiStore';
import type { UiStoreState } from '../stores/uiStore';

const ensureStoreRef = <T>(factory: () => StoreApi<T>, ref: { current: StoreApi<T> | null }) => {
  ref.current ??= factory();
  return ref.current;
};

export const useGameStores = () => {
  const runtimeStoreRef = useRef<StoreApi<RuntimeStoreState> | null>(null);
  const battleStoreRef = useRef<StoreApi<BattleStoreState> | null>(null);
  const uiStoreRef = useRef<StoreApi<UiStoreState> | null>(null);
  const renderStateStoreRef = useRef<StoreApi<RenderStateStoreState> | null>(null);
  const gameSpeedStoreRef = useRef<StoreApi<GameSpeedStoreState> | null>(null);

  const runtimeStore = ensureStoreRef(createRuntimeStore, runtimeStoreRef);
  const battleStore = ensureStoreRef(createBattleStore, battleStoreRef);
  const uiStore = ensureStoreRef(createUiStore, uiStoreRef);
  const renderStateStore = ensureStoreRef(createRenderStateStore, renderStateStoreRef);
  const gameSpeedStore = ensureStoreRef(createGameSpeedStore, gameSpeedStoreRef);

  const runtime = useStore(runtimeStore, (state) => state.runtime);
  const renderStateRef = useStore(renderStateStore, (state) => state.renderStateRef);
  const gameSpeed = useStore(gameSpeedStore, (state) => state.gameSpeed);
  const setGameSpeed = useStore(gameSpeedStore, (state) => state.setGameSpeed);

  return {
    runtime,
    dispatch: (action: RuntimeAction) => {
      if (action.type === 'uiAction') {
        uiStore.getState().dispatch(action);
        runtimeStore.getState().dispatch(action);
        return;
      }

      battleStore.getState().dispatch(action);
      uiStore.getState().dispatch(action);
      runtimeStore.getState().dispatch(action);
    },
    renderStateRef,
    gameSpeed,
    setGameSpeed,
  };
};
