import { createContext, useContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';

import type { GameState } from '../types';

import { useAudio } from './audio/AudioManager';
import type {
  GameContextProps,
  GameUiContextProps,
  RenderStateContextProps,
  WorldContextProps,
} from './contextTypes';
import {
  buildGameContextValue,
  buildGameUiValue,
  buildRenderStateValue,
  buildWorldValue,
} from './contextValueBuilders';
import { useAutosaveCheckpoint } from './hooks/useAutosaveCheckpoint';
import { useDerivedEntities } from './hooks/useDerivedEntities';
import { useGameActions } from './hooks/useGameActions';
import { useGameStep } from './hooks/useGameStep';
import { useGameStores } from './hooks/useGameStores';

/** Context for managing game state. */
const GameContext = createContext<GameContextProps | undefined>(undefined);
const GameUiContext = createContext<GameUiContextProps | undefined>(undefined);
const RenderStateContext = createContext<RenderStateContextProps | undefined>(undefined);
const WorldContext = createContext<WorldContextProps | undefined>(undefined);

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

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { playSFX } = useAudio();
  const { runtime, dispatch, renderStateRef, gameSpeed, setGameSpeed } = useGameStores();

  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  const lastAutosavedNonceRef = useRef<number>(-1);
  useAutosaveCheckpoint(runtime, runtimeRef, lastAutosavedNonceRef);

  const {
    enemyTypeMap,
    mapGrid,
    pathWaypoints,
    enginePathWaypoints,
    enemies,
    towers,
    projectiles,
    effects,
    waveState,
  } = useDerivedEntities(runtime);

  const {
    isValidPlacement,
    placeTower,
    upgradeTower,
    sellTower,
    skipWave,
    startGame,
    resetGame,
    applyCheckpointSave,
    resetCheckpoint,
    factoryReset,
    exportCheckpointJson,
    startNextSector,
    purchaseUpgrade,
    setGraphicsQuality,
    setSelectedTower,
    setSelectedEntityId,
    removeEffect,
    clearAnnouncement,
  } = useGameActions({
    runtimeRef,
    dispatch,
    renderStateRef,
    mapGrid,
    enemyTypeMap,
    playSFX,
    lastAutosavedNonceRef,
  });

  const { step } = useGameStep({
    runtimeRef,
    renderStateRef,
    dispatch,
    enginePathWaypoints,
    enemyTypeMap,
    gameSpeed,
    playSFX,
  });

  const gameState: GameState = {
    ...runtime.ui,
    isPlaying: runtime.ui.gameStatus === 'playing',
  };

  const gameContextValue = useMemo(
    () =>
      buildGameContextValue({
        gameState,
        enemies,
        towers,
        projectiles,
        effects,
        waveState,
        step,
        removeEffect,
        placeTower,
        startGame,
        resetGame,
        selectedTower: runtime.ui.selectedTower,
        setSelectedTower,
        selectedEntityId: runtime.ui.selectedEntityId,
        setSelectedEntityId,
        upgradeTower,
        sellTower,
        isValidPlacement,
        mapGrid,
        pathWaypoints,
        startNextSector,
        purchaseUpgrade,
        setGraphicsQuality,
        resetCheckpoint,
        factoryReset,
        applyCheckpointSave,
        exportCheckpointJson,
        skipWave,
        gameSpeed,
        setGameSpeed,
        renderStateRef,
        clearAnnouncement,
      }),
    [
      gameState,
      enemies,
      towers,
      projectiles,
      effects,
      waveState,
      step,
      removeEffect,
      placeTower,
      startGame,
      resetGame,
      runtime.ui.selectedTower,
      setSelectedTower,
      runtime.ui.selectedEntityId,
      setSelectedEntityId,
      upgradeTower,
      sellTower,
      isValidPlacement,
      mapGrid,
      pathWaypoints,
      startNextSector,
      purchaseUpgrade,
      setGraphicsQuality,
      resetCheckpoint,
      factoryReset,
      applyCheckpointSave,
      exportCheckpointJson,
      skipWave,
      gameSpeed,
      setGameSpeed,
      renderStateRef,
      clearAnnouncement,
    ],
  );

  const gameUiValue = useMemo(
    () =>
      buildGameUiValue({
        gameState,
        waveState,
        step,
        removeEffect,
        placeTower,
        startGame,
        resetGame,
        selectedTower: runtime.ui.selectedTower,
        setSelectedTower,
        selectedEntityId: runtime.ui.selectedEntityId,
        setSelectedEntityId,
        upgradeTower,
        sellTower,
        startNextSector,
        purchaseUpgrade,
        setGraphicsQuality,
        resetCheckpoint,
        factoryReset,
        applyCheckpointSave,
        exportCheckpointJson,
        skipWave,
        gameSpeed,
        setGameSpeed,
        clearAnnouncement,
      }),
    [
      gameState,
      waveState,
      step,
      removeEffect,
      placeTower,
      startGame,
      resetGame,
      runtime.ui.selectedTower,
      setSelectedTower,
      runtime.ui.selectedEntityId,
      setSelectedEntityId,
      upgradeTower,
      sellTower,
      startNextSector,
      purchaseUpgrade,
      setGraphicsQuality,
      resetCheckpoint,
      factoryReset,
      applyCheckpointSave,
      exportCheckpointJson,
      skipWave,
      gameSpeed,
      setGameSpeed,
      clearAnnouncement,
    ],
  );

  const renderStateValue = useMemo(() => buildRenderStateValue(renderStateRef), [renderStateRef]);

  const worldValue = useMemo(
    () =>
      buildWorldValue({
        mapGrid,
        currentMapIndex: runtime.ui.currentMapIndex,
        placeTower,
        isValidPlacement,
        selectedTower: runtime.ui.selectedTower,
        gameStatus: runtime.ui.gameStatus,
        setSelectedEntityId,
        renderStateRef,
      }),
    [
      mapGrid,
      runtime.ui.currentMapIndex,
      placeTower,
      isValidPlacement,
      runtime.ui.selectedTower,
      runtime.ui.gameStatus,
      setSelectedEntityId,
      renderStateRef,
    ],
  );

  return (
    <GameContext.Provider value={gameContextValue}>
      <GameUiContext.Provider value={gameUiValue}>
        <RenderStateContext.Provider value={renderStateValue}>
          <WorldContext.Provider value={worldValue}>{children}</WorldContext.Provider>
        </RenderStateContext.Provider>
      </GameUiContext.Provider>
    </GameContext.Provider>
  );
};
