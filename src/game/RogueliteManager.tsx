import { useCallback, useEffect, useRef } from 'react';

import { MAP_HEIGHT, MAP_WIDTH } from '../constants';

import { useGameUi } from './gameContexts';
import { wfcClient } from './wfc/WFCClient';

/**
 * Manages the Roguelite mode lifecycle:
 * - Detects phase completion (Wave 10)
 * - Triggers map generation
 * - Handles transitions
 */
export const RogueliteManager = () => {
  const { gameState, waveState, nextRoguePhase, setCustomMapLayout } = useGameUi();

  const processingRef = useRef(false);

  const generateAndSetMap = useCallback(
    async (seed: string) => {
      const mapLayout = await wfcClient.generateMap(seed, MAP_WIDTH, MAP_HEIGHT);
      if (mapLayout.length === 0) {
        console.error('Map Gen failed');
        return;
      }
      setCustomMapLayout(mapLayout);
    },
    [setCustomMapLayout],
  );

  const handlePhaseTransition = useCallback(async () => {
    const newSeed = `${gameState.customMapSeed}-${gameState.roguePhase + 1}`;
    const mapLayout = await wfcClient.generateMap(newSeed, MAP_WIDTH, MAP_HEIGHT);
    if (mapLayout.length === 0) {
      console.error('Map Gen failed');
      return;
    }

    nextRoguePhase(newSeed);
    setCustomMapLayout(mapLayout);
  }, [gameState.customMapSeed, gameState.roguePhase, nextRoguePhase, setCustomMapLayout]);

  useEffect(() => {
    if (gameState.gameMode !== 'ROGUELITE') return;
    if (gameState.gameStatus !== 'playing') return;

    const isPhaseDone =
      gameState.wave > 0 &&
      gameState.wave % 10 === 0 &&
      waveState?.phase === 'completed' &&
      waveState.enemiesAlive === 0;

    if (isPhaseDone && !processingRef.current) {
      processingRef.current = true;
      void handlePhaseTransition();
    }

    if (gameState.wave === 1) {
      processingRef.current = false;
    }
  }, [
    gameState.gameMode,
    gameState.gameStatus,
    gameState.wave,
    handlePhaseTransition,
    waveState?.enemiesAlive,
    waveState?.phase,
  ]);

  useEffect(() => {
    if (
      gameState.gameMode === 'ROGUELITE' &&
      gameState.gameStatus === 'playing' &&
      !gameState.customMapLayout &&
      gameState.customMapSeed
    ) {
      if (!processingRef.current) {
        processingRef.current = true;
        console.warn('Generating Initial Roguelite Map for Seed:', gameState.customMapSeed);
        void generateAndSetMap(gameState.customMapSeed).finally(() => {
          processingRef.current = false;
        });
      }
    }
  }, [
    gameState.gameMode,
    gameState.gameStatus,
    gameState.customMapLayout,
    gameState.customMapSeed,
    generateAndSetMap,
  ]);

  return null;
};
