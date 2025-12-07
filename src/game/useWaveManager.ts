import { useState, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { ENEMY_TYPES, PATH_WAYPOINTS, TILE_SIZE } from '../constants';
import { EnemyEntity, WaveState, WavePhase } from '../types';

export const useWaveManager = (
  isPlaying: boolean,
  setEnemies: React.Dispatch<React.SetStateAction<EnemyEntity[]>>,
  setGameState: React.Dispatch<React.SetStateAction<any>>, // Using any for partial updates easier
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
      enemiesAlive: count, // We consider them "alive" as soon as they are effectively queued to spawn for tracking purposes? No, let's track separately.
    }));

    // Wait, enemiesAlive should track actual entities.
    // Let's refine:
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
      wave: 0,
      phase: 'preparing',
      nextWaveTime: 0,
      enemiesAlive: 0,
      enemiesRemainingToSpawn: 0,
      timer: 5,
    };
    setWaveState(stateRef.current);
    spawnTimerRef.current = 0;
    // We set timer to 5 in state, but spawnTimerRef handles the delta decrement. 
    // Actually, let's keep spawnTimerRef at 5 to match state?
    // In logic below: if (currentState.phase === 'preparing') spawnTimerRef.current -= delta.
    // So we should set it to 5.
    spawnTimerRef.current = 5;
  }, []);

  const updateWave = useCallback(
    (delta: number, currentEnemies: EnemyEntity[]) => {
      if (!isPlaying) return;

      const currentState = stateRef.current;

      // Update enemies alive count based on actual array
      if (currentState.enemiesAlive !== currentEnemies.length) {
        setWaveState((prev) => ({ ...prev, enemiesAlive: currentEnemies.length }));
      }

      // State Machine & Timer Sync
      // We only update state timer occasionally to avoid excessive re-renders,
      // or we just trust the component to read it? React state needs explicit update.
      // Let's update it every frame if it changes significantly or just ensure it's roughly correct.
      if (currentState.phase === 'preparing') {
        spawnTimerRef.current -= delta;
        // Sync to state for UI (cast to 1 decimal for display)
        if (Math.abs(currentState.timer - spawnTimerRef.current) > 0.1) {
          setWaveState((prev) => ({ ...prev, timer: spawnTimerRef.current }));
        }

        if (spawnTimerRef.current <= 0) {
          // Always start logic from here
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

          const startNode = PATH_WAYPOINTS[0];
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
          setWaveState((prev) => ({
            ...prev,
            phase: 'completed',
            nextWaveTime: Date.now() + PREP_TIME * 1000, // Just visual target?
          }));
          spawnTimerRef.current = PREP_TIME; // Reuse timer for intermission
        }
      } else if (currentState.phase === 'completed') {
        // Transition back to preparing/start next automatically?
        // Let's just go directly to prep for next wave
        setWaveState((prev) => ({ ...prev, phase: 'preparing' }));
      }
    },
    [isPlaying, setEnemies, startNextWave],
  );

  return { waveState, updateWave, resetWave };
};
