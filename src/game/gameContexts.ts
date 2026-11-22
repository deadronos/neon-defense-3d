import { createContext, useContext, useMemo } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type {
  GameContextProps,
  GameUiContextProps,
  RenderStateContextProps,
  WorldContextProps,
} from './contextTypes';
import { useDerivedEntities } from './hooks/useDerivedEntities';
import type { RuntimeStoreState } from './stores/runtimeStore';
import type { buildEnemyTypeMap } from './transforms';

interface GameContextSource extends Pick<
  GameContextProps,
  'pathWaypoints' | 'mapGrid' | 'isValidPlacement' | 'renderStateRef'
> {
  runtimeStore: StoreApi<RuntimeStoreState>;
  enemyTypeMap: ReturnType<typeof buildEnemyTypeMap>;
  ui: GameUiContextProps;
}

export const GameContext = createContext<GameContextSource | undefined>(undefined);
export const GameUiContext = createContext<GameUiContextProps | undefined>(undefined);
export const RenderStateContext = createContext<RenderStateContextProps | undefined>(undefined);
export const WorldContext = createContext<WorldContextProps | undefined>(undefined);

const useGameSource = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

export const useGame = (): GameContextProps => {
  const {
    runtimeStore,
    enemyTypeMap,
    pathWaypoints,
    mapGrid,
    isValidPlacement,
    renderStateRef,
    ui,
  } = useGameSource();
  const engine = useStore(runtimeStore, (state) => state.runtime.engine);
  const { enemies, towers, projectiles, effects, waveState } = useDerivedEntities(
    engine,
    enemyTypeMap,
    pathWaypoints,
  );
  return useMemo(
    () => ({
      ...ui,
      enemies,
      towers,
      projectiles,
      effects,
      waveState,
      pathWaypoints,
      mapGrid,
      isValidPlacement,
      renderStateRef,
    }),
    [
      ui,
      enemies,
      towers,
      projectiles,
      effects,
      waveState,
      pathWaypoints,
      mapGrid,
      isValidPlacement,
      renderStateRef,
    ],
  );
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
