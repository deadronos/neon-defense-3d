import { useMemo } from 'react';
import type { ReactNode } from 'react';

import type { GameState } from '../types';

import { useAudio } from './audio/useAudio';
import { buildGameUiValue, buildRenderStateValue, buildWorldValue } from './contextValueBuilders';
import { GameContext, GameUiContext, RenderStateContext, WorldContext } from './gameContexts';
import { useAutosaveCheckpoint } from './hooks/useAutosaveCheckpoint';
import { useGameMap } from './hooks/useDerivedEntities';
import { useGameActions } from './hooks/useGameActions';
import { useGameStep } from './hooks/useGameStep';
import { useGameStores } from './hooks/useGameStores';
import { toTowerEntity } from './transforms';

// eslint-disable-next-line max-lines-per-function
export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { playSFX } = useAudio();
  const {
    ui,
    hudTowers,
    waveState,
    runtimeStore,
    getRuntime,
    dispatch,
    renderStateRef,
    gameSpeed,
    setGameSpeed,
  } = useGameStores();

  useAutosaveCheckpoint(ui, getRuntime);

  const { enemyTypeMap, mapGrid, pathWaypoints, enginePathWaypoints } = useGameMap(ui);
  const towers = useMemo(() => hudTowers.map(toTowerEntity), [hudTowers]);

  const {
    isValidPlacement,
    placeTower,
    upgradeTower,
    setTowerTargetingMode,
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
    getRuntime,
    dispatch,
    renderStateRef,
    mapGrid,
    enemyTypeMap,
    playSFX,
  });

  const { step } = useGameStep({
    getRuntime,
    renderStateRef,
    dispatch,
    enginePathWaypoints,
    enemyTypeMap,
    playSFX,
  });

  const gameState = useMemo<GameState>(
    () => ({
      ...ui,
      isPlaying: ui.gameStatus === 'playing',
    }),
    [ui],
  );

  const gameUiValue = useMemo(
    () =>
      buildGameUiValue({
        gameState,
        towers,
        waveState,
        step,
        removeEffect,
        placeTower,
        startGame,
        resetGame,
        selectedTower: ui.selectedTower,
        setSelectedTower,
        selectedEntityId: ui.selectedEntityId,
        setSelectedEntityId,
        upgradeTower,
        setTowerTargetingMode,
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
      towers,
      waveState,
      step,
      removeEffect,
      placeTower,
      startGame,
      resetGame,
      ui.selectedTower,
      setSelectedTower,
      ui.selectedEntityId,
      setSelectedEntityId,
      upgradeTower,
      setTowerTargetingMode,
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
        currentMapIndex: ui.currentMapIndex,
        placeTower,
        isValidPlacement,
        upgrades: ui.upgrades,
        selectedTower: ui.selectedTower,
        gameStatus: ui.gameStatus,
        setSelectedEntityId,
        renderStateRef,
      }),
    [
      mapGrid,
      ui.currentMapIndex,
      placeTower,
      isValidPlacement,
      ui.upgrades,
      ui.selectedTower,
      ui.gameStatus,
      setSelectedEntityId,
      renderStateRef,
    ],
  );

  const gameContextValue = useMemo(
    () => ({
      runtimeStore,
      enemyTypeMap,
      pathWaypoints,
      mapGrid,
      isValidPlacement,
      renderStateRef,
      ui: gameUiValue,
    }),
    [
      runtimeStore,
      enemyTypeMap,
      pathWaypoints,
      mapGrid,
      isValidPlacement,
      renderStateRef,
      gameUiValue,
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
