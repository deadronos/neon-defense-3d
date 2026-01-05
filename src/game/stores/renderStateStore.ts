import type { MutableRefObject } from 'react';
import type { StoreApi } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { createInitialRenderState } from '../renderStateUtils';
import type { RenderState } from '../renderStateUtils';

export interface RenderStateStoreState {
  renderStateRef: MutableRefObject<RenderState>;
}

export const createRenderStateStore = (): StoreApi<RenderStateStoreState> =>
  createStore<RenderStateStoreState>(() => ({
    renderStateRef: { current: createInitialRenderState() },
  }));
