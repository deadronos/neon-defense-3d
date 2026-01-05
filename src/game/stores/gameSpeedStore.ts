import type { StoreApi } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface GameSpeedStoreState {
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
}

export const createGameSpeedStore = (): StoreApi<GameSpeedStoreState> =>
  createStore<GameSpeedStoreState>((set) => ({
    gameSpeed: 1,
    setGameSpeed: (speed) => set({ gameSpeed: speed }),
  }));
