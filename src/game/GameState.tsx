import { useMemo, useRef } from 'react';
import type { ReactNode } from 'react';

import type { GameState } from '../types';

import { useAudio } from './audio/useAudio';
import {
  buildGameContextValue,
  buildGameUiValue,
  buildRenderStateValue,
  buildWorldValue,
} from './contextValueBuilders';
import { GameContext, GameUiContext, RenderStateContext, WorldContext } from './gameContexts';
import { useAutosaveCheckpoint } from './hooks/useAutosaveCheckpoint';
import { useDerivedEntities } from './hooks/useDerivedEntities';
import { useGameActions } from './hooks/useGameActions';
import { useGameStep } from './hooks/useGameStep';
import { useGameStores } from './hooks/useGameStores';

// eslint-disable-next-line max-lines-per-function
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
    startRogueliteRun,
    nextRoguePhase,
    setCustomMapLayout,
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

  const gameState = useMemo<GameState>(
    () => ({
      ...runtime.ui,
      isPlaying: runtime.ui.gameStatus === 'playing',
    }),
    [runtime.ui],
  );

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
        startRogueliteRun,
        nextRoguePhase,
        setCustomMapLayout,
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
      startRogueliteRun,
      nextRoguePhase,
      setCustomMapLayout,
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
        startRogueliteRun,
        nextRoguePhase,
        setCustomMapLayout,
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
      startRogueliteRun,
      nextRoguePhase,
      setCustomMapLayout,
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
