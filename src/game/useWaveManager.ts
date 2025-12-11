import { useState, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { ENEMY_TYPES, TILE_SIZE } from '../constants';
import { EnemyEntity, WaveState, WavePhase, GameState, Vector2 } from '../types';

export const useWaveManager = (
  gameState: GameState,
  setEnemies: React.Dispatch<React.SetStateAction<EnemyEntity[]>>,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  pathWaypoints: Vector2[],
) => {
  const [waveState, setWaveState] = useState<WaveState>({
    wave: 0,
    phase: 'preparing',
    nextWaveTime: 0,
    enemiesAlive: 0,
    enemiesRemainingToSpawn: 0,
    timer: 5, // Initialize with prep time
  });

  const stateRef = useRef(waveState);
  stateRef.current = waveState;

  const spawnTimerRef = useRef(0);
  const waveConfigRef = useRef<{ count: number; interval: number; types: any[] }>({
    count: 0,
    interval: 1,
    types: [],
  });

  const PREP_TIME = 5; // Seconds between waves

  const startNextWave = useCallback(() => {
    const nextWave = stateRef.current.wave + 1;
    // Basic progression logic
    const count = 5 + Math.floor(nextWave * 1.5);
    const interval = Math.max(0.3, 2.0 - nextWave * 0.1);

    // Determine enemy types for this wave
    const types = [ENEMY_TYPES.BASIC];
    if (nextWave >= 2) types.push(ENEMY_TYPES.FAST);
    if (nextWave >= 5) types.push(ENEMY_TYPES.TANK);
    if (nextWave % 5 === 0) types.push(ENEMY_TYPES.BOSS);

    waveConfigRef.current = { count, interval, types };

    setWaveState((prev) => ({
      ...prev,
      wave: nextWave,
      phase: 'spawning',
      enemiesRemainingToSpawn: count,
      enemiesAlive: 0, // Will increment as they spawn
    }));

    // Update global game state for UI if needed
    setGameState((g: any) => ({ ...g, wave: nextWave }));
  }, [setGameState]);

  const resetWave = useCallback(() => {
    stateRef.current = {
      wave: 0, // Resetting to 0 might be problematic for continuous levels if called wrongly
      phase: 'preparing',
      nextWaveTime: 0,
      enemiesAlive: 0,
      enemiesRemainingToSpawn: 0,
      timer: 5,
    };
    setWaveState(stateRef.current);
    spawnTimerRef.current = 5;
  }, []);

  const updateWave = useCallback(
    (delta: number, currentEnemies: EnemyEntity[]) => {
      if (!gameState.isPlaying) return;

      const currentState = stateRef.current;

      // Update enemies alive count based on actual array
      if (currentState.enemiesAlive !== currentEnemies.length) {
        setWaveState((prev) => ({ ...prev, enemiesAlive: currentEnemies.length }));
      }

      // State Machine & Timer Sync
      if (currentState.phase === 'preparing') {
        spawnTimerRef.current -= delta;
        // Sync to state for UI (cast to 1 decimal for display)
        if (Math.abs(currentState.timer - spawnTimerRef.current) > 0.1) {
          setWaveState((prev) => ({ ...prev, timer: spawnTimerRef.current }));
        }

        if (spawnTimerRef.current <= 0) {
          startNextWave();
        }
      } else if (currentState.phase === 'spawning') {
        spawnTimerRef.current -= delta;
        if (spawnTimerRef.current <= 0 && currentState.enemiesRemainingToSpawn > 0) {
          spawnTimerRef.current = waveConfigRef.current.interval;

          // SPAWN LOGIC
          const config = waveConfigRef.current;
          const typeConfig = config.types[Math.floor(Math.random() * config.types.length)];
          const waveMult = currentState.wave;

          const hp = typeConfig.hpBase * (1 + (waveMult - 1) * 0.4);
          const shield = (typeConfig.shield || 0) * (1 + (waveMult - 1) * 0.5);

          const startNode = pathWaypoints[0];
          if (!startNode) return; // Should not happen if path exists

          const newEnemy: EnemyEntity = {
            id: Math.random().toString(36).substr(2, 9),
            config: {
              ...typeConfig,
              hp,
              shield,
              reward: typeConfig.reward + Math.floor(waveMult * 2),
            },
            pathIndex: 0,
            progress: 0,
            position: new THREE.Vector3(startNode[0] * TILE_SIZE, 1, startNode[1] * TILE_SIZE),
            hp: hp,
            shield: shield,
            maxShield: shield,
            frozen: 0,
            abilityCooldown: 2 + Math.random() * 3,
            abilityActiveTimer: 0,
          } as any;

          setEnemies((prev) => [...prev, newEnemy]);

          setWaveState((prev) => {
            const remaining = prev.enemiesRemainingToSpawn - 1;
            return {
              ...prev,
              enemiesRemainingToSpawn: remaining,
              phase: remaining === 0 ? 'active' : 'spawning',
            };
          });
        }
      } else if (currentState.phase === 'active') {
        // Check for completion
        if (currentEnemies.length === 0 && currentState.enemiesRemainingToSpawn === 0) {
          // Check for Sector Completion (every 10 waves)
          // Ensure we don't trigger this if already victorious (though isPlaying should handle that)
          if (currentState.wave > 0 && currentState.wave % 10 === 0) {
            const earnedRP = Math.floor(
              gameState.totalDamageDealt / 200 + gameState.totalCurrencyEarned / 100,
            );

            setGameState((prev: GameState) => ({
              ...prev,
              gameStatus: 'victory',
              isPlaying: false, // Pause game
              researchPoints: prev.researchPoints + earnedRP,
            }));

            setWaveState((prev) => ({
              ...prev,
              phase: 'completed',
            }));
            return;
          }

          setWaveState((prev) => ({
            ...prev,
            phase: 'completed',
            nextWaveTime: Date.now() + PREP_TIME * 1000,
          }));
          spawnTimerRef.current = PREP_TIME;
        }
      } else if (currentState.phase === 'completed') {
        // If we are here, game is playing (not victory/paused), so we proceed to next wave
        setWaveState((prev) => ({ ...prev, phase: 'preparing' }));
      }
    },
    [
      gameState.isPlaying,
      gameState.totalDamageDealt,
      gameState.totalCurrencyEarned,
      setEnemies,
      startNextWave,
      pathWaypoints,
      setGameState,
    ],
  );

  return { waveState, updateWave, resetWave };
};
