import { useCallback, useRef } from 'react';
import type { StoreApi } from 'zustand';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { createGameSpeedStore } from '../stores/gameSpeedStore';
import type { GameSpeedStoreState } from '../stores/gameSpeedStore';
import { createRenderStateStore } from '../stores/renderStateStore';
import type { RenderStateStoreState } from '../stores/renderStateStore';
import { createRuntimeStore } from '../stores/runtimeStore';
import type { RuntimeStoreState } from '../stores/runtimeStore';
import { toWaveState } from '../transforms';

const ensureStoreRef = <T>(factory: () => StoreApi<T>, ref: { current: StoreApi<T> | null }) => {
  ref.current ??= factory();
  return ref.current;
};

export const useGameStores = () => {
  const runtimeStoreRef = useRef<StoreApi<RuntimeStoreState> | null>(null);
  const renderStateStoreRef = useRef<StoreApi<RenderStateStoreState> | null>(null);
  const gameSpeedStoreRef = useRef<StoreApi<GameSpeedStoreState> | null>(null);

  const runtimeStore = ensureStoreRef(createRuntimeStore, runtimeStoreRef);
  const renderStateStore = ensureStoreRef(createRenderStateStore, renderStateStoreRef);
  const gameSpeedStore = ensureStoreRef(createGameSpeedStore, gameSpeedStoreRef);

  const ui = useStore(runtimeStore, (state) => state.runtime.ui);
  const hudTowers = useStore(runtimeStore, (state) => state.hudTowers);
  const waveState = useStore(
    runtimeStore,
    useShallow((state: RuntimeStoreState) => {
      const wave = toWaveState(state.runtime.engine.wave);
      if (!wave) return null;
      // The HUD displays tenths of a second during preparation only.
      wave.timer =
        wave.phase === 'preparing' && wave.timer > 0
          ? Math.max(0.001, Number(wave.timer.toFixed(1)))
          : 0;
      return wave;
    }),
  );
  const renderStateRef = useStore(renderStateStore, (state) => state.renderStateRef);
  const gameSpeed = useStore(gameSpeedStore, (state) => state.gameSpeed);
  const setGameSpeed = useStore(gameSpeedStore, (state) => state.setGameSpeed);

  const getRuntime = useCallback(() => runtimeStore.getState().runtime, [runtimeStore]);
  const dispatch = useCallback<RuntimeStoreState['dispatch']>(
    (action) => runtimeStore.getState().dispatch(action),
    [runtimeStore],
  );

  return {
    ui,
    hudTowers,
    waveState,
    getRuntime,
    dispatch,
    runtimeStore,
    renderStateRef,
    gameSpeed,
    setGameSpeed,
  };
};
