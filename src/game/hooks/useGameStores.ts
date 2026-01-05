import { useRef } from 'react';
import type { StoreApi } from 'zustand';
import { useStore } from 'zustand';

import { createGameSpeedStore } from '../stores/gameSpeedStore';
import type { GameSpeedStoreState } from '../stores/gameSpeedStore';
import { createRenderStateStore } from '../stores/renderStateStore';
import type { RenderStateStoreState } from '../stores/renderStateStore';
import { createRuntimeStore } from '../stores/runtimeStore';
import type { RuntimeStoreState } from '../stores/runtimeStore';

const ensureStoreRef = <T>(factory: () => StoreApi<T>, ref: { current: StoreApi<T> | null }) => {
  if (!ref.current) {
    ref.current = factory();
  }
  return ref.current;
};

export const useGameStores = () => {
  const runtimeStoreRef = useRef<StoreApi<RuntimeStoreState> | null>(null);
  const renderStateStoreRef = useRef<StoreApi<RenderStateStoreState> | null>(null);
  const gameSpeedStoreRef = useRef<StoreApi<GameSpeedStoreState> | null>(null);

  const runtimeStore = ensureStoreRef(createRuntimeStore, runtimeStoreRef);
  const renderStateStore = ensureStoreRef(createRenderStateStore, renderStateStoreRef);
  const gameSpeedStore = ensureStoreRef(createGameSpeedStore, gameSpeedStoreRef);

  const runtime = useStore(runtimeStore, (state) => state.runtime);
  const dispatch = useStore(runtimeStore, (state) => state.dispatch);
  const renderStateRef = useStore(renderStateStore, (state) => state.renderStateRef);
  const gameSpeed = useStore(gameSpeedStore, (state) => state.gameSpeed);
  const setGameSpeed = useStore(gameSpeedStore, (state) => state.setGameSpeed);

  return { runtime, dispatch, renderStateRef, gameSpeed, setGameSpeed };
};
