import { useEffect } from 'react';

import { MAP_HEIGHT, MAP_WIDTH } from '../constants';

import { useGameUi } from './gameContexts';
import { generateProceduralMap } from './wfc/generateMap';
import { wfcClient } from './wfc/WFCClient';

export const RogueliteManager = () => {
  const { gameState, nextRoguePhase, setCustomMapLayout } = useGameUi();
  const {
    gameMode,
    gameStatus,
    roguePhase,
    roguePhaseCompleted,
    customMapSeed,
    customMapLayout,
    sessionNonce,
  } = gameState;

  useEffect(() => {
    if (gameMode !== 'ROGUELITE' || gameStatus !== 'playing') return;
    const seed = roguePhaseCompleted
      ? `${customMapSeed ?? 'rogue'}-${roguePhase + 1}`
      : customMapLayout
        ? null
        : customMapSeed;
    if (seed === null) return;

    let cancelled = false;
    void wfcClient.generateMap(seed, MAP_WIDTH, MAP_HEIGHT).then((result) => {
      if (cancelled) return;
      const layout =
        result.length > 0 ? result : generateProceduralMap(seed, MAP_WIDTH, MAP_HEIGHT);
      if (roguePhaseCompleted) nextRoguePhase(seed, layout);
      else setCustomMapLayout(layout);
    });

    return () => {
      cancelled = true;
    };
  }, [
    gameMode,
    gameStatus,
    roguePhase,
    roguePhaseCompleted,
    customMapSeed,
    customMapLayout,
    sessionNonce,
    nextRoguePhase,
    setCustomMapLayout,
  ]);

  return null;
};
