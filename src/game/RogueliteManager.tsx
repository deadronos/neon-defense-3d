
import { useEffect, useRef } from 'react';
import { useGameUi } from './gameContexts';
import { useGameActions } from './hooks/useGameActions';
import { wfcClient } from './wfc/WFCClient';
import { MAP_WIDTH, MAP_HEIGHT, INITIAL_MAP_GRID } from '../constants';
import { getMapGrid } from '../constants';

/**
 * Manages the Roguelite mode lifecycle:
 * - Detects phase completion (Wave 10)
 * - Triggers map generation
 * - Handles transitions
 */
export const RogueliteManager = () => {
   const { 
      gameState, 
      waveState, 
      startRogueliteRun, 
      nextRoguePhase, 
      setCustomMapLayout,
      startGame,
      resetGame
   } = useGameUi();
   
   const processingRef = useRef(false);
   
   useEffect(() => {
      if (gameState.gameMode !== 'ROGUELITE') return;
      if (gameState.gameStatus !== 'playing') return;
      
      // Check for Phase Completion
      // Wave 11 start? Or Wave 10 complete?
      // Wave 10 Complete -> waveState.wave = 10, phase = 'completed' ?
      
      const isPhaseDone = gameState.wave > 0 && gameState.wave % 10 === 0 && waveState?.phase === 'completed' && waveState.enemiesAlive === 0;
      
      if (isPhaseDone && !processingRef.current) {
         processingRef.current = true;
         handlePhaseTransition();
      }
      
      // Reset processing flag when wave changes (e.g. back to 1)
      if (gameState.wave === 1) {
         processingRef.current = false;
      }
      
   }, [gameState.wave, gameState.gameStatus, waveState?.phase, waveState?.enemiesAlive]);

   // Handle Initial Map Generation
   useEffect(() => {
     if (gameState.gameMode === 'ROGUELITE' && gameState.gameStatus === 'playing' && !gameState.customMapLayout && gameState.customMapSeed) {
        if (!processingRef.current) {
            processingRef.current = true;
            console.log("Generating Initial Roguelite Map for Seed:", gameState.customMapSeed);
            generateAndSetMap(gameState.customMapSeed).then(() => {
                processingRef.current = false;
            });
        }
     }
   }, [gameState.gameMode, gameState.gameStatus, gameState.customMapLayout, gameState.customMapSeed]);


   const generateAndSetMap = async (seed: string) => {
       const mapLayout = await wfcClient.generateMap(seed, MAP_WIDTH, MAP_HEIGHT);
       if (!mapLayout || mapLayout.length === 0) {
           console.error("Map Gen failed");
           // Retry?
           return;
       }
       setCustomMapLayout(mapLayout);
   };

   const handlePhaseTransition = async () => {
       // Pause / Show Overlay?
       // Generate new Seed
       const newSeed = `${gameState.customMapSeed}-${gameState.roguePhase + 1}`;
       
       // Generate
       // We need to update the Map Grid in derived entities?
       // The Map Grid is derived from 'currentMapIndex' or 'customMapSeed'.
       // We need a way to injection the new grid.
       // Plan: 'customMapSeed' in store triggers a generation or we store the GRID in the store?
       // Storing 12x8 grid in Reducer is fine.
       
       // Note: implementation details depend on how we expose the grid update.
       // Current 'useDerivedEntities' derives it from constants if index >= 0.
       // We need to modify useDerivedEntities to resolve the promise?
       // Or generate here and dispatch "SET_CUSTOM_MAP".
       
       const mapLayout = await wfcClient.generateMap(newSeed, MAP_WIDTH, MAP_HEIGHT);
       if (!mapLayout || mapLayout.length === 0) {
           console.error("Map Gen failed");
           // Retry?
           return;
       }
       
       // Dispatch Next Phase
       nextRoguePhase(newSeed);
       setCustomMapLayout(mapLayout);
   };
   
   return null;
}
