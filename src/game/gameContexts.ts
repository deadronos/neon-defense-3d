import { createContext, useContext } from 'react';

import type {
  GameContextProps,
  GameUiContextProps,
  RenderStateContextProps,
  WorldContextProps,
} from './contextTypes';

/** Context for managing game state. */
export const GameContext = createContext<GameContextProps | undefined>(undefined);
export const GameUiContext = createContext<GameUiContextProps | undefined>(undefined);
export const RenderStateContext = createContext<RenderStateContextProps | undefined>(undefined);
export const WorldContext = createContext<WorldContextProps | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

export const useGameUi = () => {
  const context = useContext(GameUiContext);
  if (!context) throw new Error('useGameUi must be used within GameProvider');
  return context;
};

export const useRenderState = () => {
  const context = useContext(RenderStateContext);
  if (!context) throw new Error('useRenderState must be used within GameProvider');
  return context.renderStateRef;
};

export const useWorld = () => {
  const context = useContext(WorldContext);
  if (!context) throw new Error('useWorld must be used within GameProvider');
  return context;
};
