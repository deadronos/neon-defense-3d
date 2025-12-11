import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import { MAP_LAYOUTS, getMapGrid, generatePath } from '../constants';

import type { GameContextProps } from './contextTypes';
import { useEntityState } from './hooks/useEntityState';
import { useGameStats } from './hooks/useGameStats';
import { useTowerState } from './hooks/useTowerState';
import { useGameOrchestrator } from './orchestrator';
import { useWaveManager } from './useWaveManager';

/** Context for managing game state. */
const GameContext = createContext<GameContextProps | undefined>(undefined);

/**
 * Hook to access the GameContext.
 *
 * @throws Error if used outside of a GameProvider.
 * @returns The GameContextProps.
 */
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

/**
 * Provider component that wraps the game and manages state.
 *
 * @param props - Component properties.
 * @param props.children - Child components to render.
 */
export const GameProvider = ({ children }: { children: ReactNode }) => {
  const {
    gameState,
    setGameState,
    startGame: startGameStats,
    resetGame: resetGameStats,
  } = useGameStats();

  const { enemies, setEnemies, projectiles, setProjectiles, effects, setEffects } =
    useEntityState();

  // Derive Map Data
  const currentMapLayout = MAP_LAYOUTS[gameState.currentMapIndex % MAP_LAYOUTS.length];
  // Memoize these if performance becomes an issue, but map index changes rarely.
  const mapGrid = getMapGrid(currentMapLayout);
  const pathWaypoints = generatePath(currentMapLayout);

  const {
    towers,
    setTowers,
    selectedTower,
    setSelectedTower,
    selectedEntityId,
    setSelectedEntityId,
    placeTower,
    upgradeTower,
    sellTower,
    isValidPlacement,
  } = useTowerState(gameState, setGameState, mapGrid);

  const { waveState, updateWave, resetWave } = useWaveManager(
    gameState,
    setEnemies,
    setGameState,
    pathWaypoints,
  );

  const { startGame, resetGame, startNextSector, purchaseUpgrade } = useGameOrchestrator(
    gameState,
    setGameState,
    setEnemies,
    setTowers,
    setProjectiles,
    setEffects,
    setSelectedEntityId,
    startGameStats,
    resetGameStats,
    resetWave,
  );

  return (
    <GameContext.Provider
      value={{
        gameState,
        enemies,
        towers,
        projectiles,
        effects,
        placeTower,
        startGame,
        resetGame,
        selectedTower,
        setSelectedTower,
        selectedEntityId,
        setSelectedEntityId,
        upgradeTower,
        sellTower,
        isValidPlacement,
        setEnemies,
        setTowers,
        setProjectiles,
        setEffects,
        setGameState,
        waveState,
        updateWave,
        resetWave,
        setWaveState: undefined, // Managed internally by hook
        mapGrid: getMapGrid(MAP_LAYOUTS[gameState.currentMapIndex % MAP_LAYOUTS.length]),
        pathWaypoints: generatePath(MAP_LAYOUTS[gameState.currentMapIndex % MAP_LAYOUTS.length]),
        startNextSector,
        purchaseUpgrade,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
