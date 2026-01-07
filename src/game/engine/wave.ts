import { ENEMY_TYPES } from '../../constants';

import type { EngineEvent } from './events';
import { allocateId, applyEnginePatch } from './state';
import type {
  EngineEnemy,
  EngineEvents,
  EngineIdCounters,
  EnginePatch,
  EngineState,
  EngineTickContext,
  EngineTickResult,
  EngineVector2,
  EngineWaveState,
} from './types';

const DEFAULT_PREP_TIME_MS = 5000;
const BASE_SPAWN_INTERVAL_MS = 2000;
const INTERVAL_DECAY_PER_WAVE_MS = 100;
const MIN_SPAWN_INTERVAL_MS = 300;

export interface StepWaveOptions {
  prepTimeMs?: number;
}

type EnemyTypeConfig = (typeof ENEMY_TYPES)[keyof typeof ENEMY_TYPES];

const createWaveConfig = (wave: number) => {
  const count = 5 + Math.floor(wave * 1.5);
  const intervalMs = Math.max(
    MIN_SPAWN_INTERVAL_MS,
    BASE_SPAWN_INTERVAL_MS - wave * INTERVAL_DECAY_PER_WAVE_MS,
  );
  const types: EnemyTypeConfig[] = [ENEMY_TYPES.BASIC];
  if (wave >= 2) types.push(ENEMY_TYPES.FAST);
  if (wave >= 5) types.push(ENEMY_TYPES.TANK);
  if (wave % 5 === 0) types.push(ENEMY_TYPES.BOSS);

  return { count, intervalMs, types };
};

export const createInitialWaveState = (
  prepTimeMs: number = DEFAULT_PREP_TIME_MS,
): EngineWaveState => ({
  wave: 0,
  phase: 'preparing',
  enemiesRemainingToSpawn: 0,
  enemiesAlive: 0,
  timerMs: prepTimeMs,
  spawnIntervalMs: BASE_SPAWN_INTERVAL_MS,
});

const chooseEnemyType = <T>(types: T[], rng: () => number): T => {
  if (types.length === 1) return types[0];
  const index = Math.floor(rng() * types.length);
  return types[Math.min(index, types.length - 1)];
};

const spawnEnemy = (
  state: EngineState,
  wave: number,
  rng: () => number,
  idCounters: EngineIdCounters,
): { enemy: EngineEnemy; idCounters: EngineIdCounters } => {
  const config = createWaveConfig(wave);
  const typeConfig = chooseEnemyType(config.types, rng);
  const waveMultiplier = wave;

  const hp = typeConfig.hpBase * (1 + (waveMultiplier - 1) * 0.4);
  const shield = (typeConfig.shield || 0) * (1 + (waveMultiplier - 1) * 0.5);
  const abilityCooldown =
    typeConfig.abilities?.includes('dash') !== true ? undefined : 2000 + rng() * 3000;

  const allocationState = applyEnginePatch(state, { idCounters });
  const { id, state: afterId } = allocateId(allocationState, 'enemy');

  const enemy: EngineEnemy = {
    id,
    type: typeConfig.name,
    pathIndex: 0,
    progress: 0,
    hp,
    shield,
    maxShield: shield,
    speed: typeConfig.speed,
    reward: typeConfig.reward + Math.floor(waveMultiplier * 2),
    color: typeConfig.color,
    scale: typeConfig.scale,
    abilityCooldown: abilityCooldown !== undefined ? abilityCooldown / 1000 : undefined,
    abilityActiveTimer: 0,
    frozen: 0,
  };

  return { enemy, idCounters: afterId.idCounters };
};

const startNextWave = (
  waveState: EngineWaveState,
  _prepTimeMs: number,
): { wave: EngineWaveState; events: EngineEvent[] } => {
  const nextWave = waveState.wave + 1;
  const config = createWaveConfig(nextWave);

  const nextWaveState: EngineWaveState = {
    wave: nextWave,
    phase: 'spawning',
    enemiesRemainingToSpawn: config.count,
    enemiesAlive: 0,
    timerMs: config.intervalMs,
    spawnIntervalMs: config.intervalMs,
  };

  return { wave: nextWaveState, events: [{ type: 'WaveStarted', wave: nextWave }] };
};

/* eslint-disable sonarjs/cognitive-complexity, complexity */
export const stepWave = (
  state: EngineState,
  pathWaypoints: readonly EngineVector2[],
  context: EngineTickContext,
  options: StepWaveOptions = {},
): EngineTickResult => {
  const prepTimeMs = options.prepTimeMs ?? DEFAULT_PREP_TIME_MS;
  const initialWave = state.wave ?? createInitialWaveState(prepTimeMs);
  let waveState = { ...initialWave };
  let idCounters = { ...state.idCounters };
  let enemies = state.enemies;

  const events: EngineEvents = { immediate: [], deferred: [] };

  // Transition from active -> completed when enemies are cleared
  const shouldCompleteWave =
    waveState.phase === 'active' && waveState.enemiesRemainingToSpawn === 0 && enemies.length === 0;
  if (shouldCompleteWave) {
    events.immediate.push({ type: 'WaveCompleted', wave: waveState.wave });
    waveState = {
      ...waveState,
      phase: 'completed',
      timerMs: prepTimeMs,
      enemiesAlive: 0,
    };
  }

  if (waveState.phase === 'completed') {
    waveState = { ...waveState, phase: 'preparing', timerMs: prepTimeMs };
  }

  if (waveState.phase === 'preparing') {
    const nextTimer = waveState.timerMs - context.deltaMs;
    if (nextTimer <= 0) {
      const started = startNextWave(waveState, prepTimeMs);
      waveState = started.wave;
      events.immediate.push(...started.events);
    } else {
      waveState = { ...waveState, timerMs: nextTimer };
    }
  } else if (waveState.phase === 'spawning') {
    let timerMs = waveState.timerMs - context.deltaMs;
    let remaining = waveState.enemiesRemainingToSpawn;
    const spawnIntervalMs = waveState.spawnIntervalMs;
    const spawnList: EngineEnemy[] = [];

    while (remaining > 0 && timerMs <= 0) {
      if (pathWaypoints.length === 0) break;
      const spawnResult = spawnEnemy(state, waveState.wave, context.rng, idCounters);
      idCounters = spawnResult.idCounters;
      spawnList.push(spawnResult.enemy);
      timerMs += spawnIntervalMs;
      remaining -= 1;
    }

    if (spawnList.length > 0) {
      enemies = [...enemies, ...spawnList];
    }

    const phase = remaining === 0 ? 'active' : 'spawning';
    waveState = {
      ...waveState,
      phase,
      enemiesRemainingToSpawn: remaining,
      enemiesAlive: enemies.length,
      timerMs: timerMs > 0 ? timerMs : spawnIntervalMs + timerMs,
    };
  } else if (waveState.phase === 'active') {
    waveState = { ...waveState, enemiesAlive: enemies.length };
  }

  const patch: EnginePatch = {
    enemies: enemies !== state.enemies ? enemies : undefined,
    idCounters: idCounters !== state.idCounters ? idCounters : undefined,
    wave: waveState,
  };

  return { patch, events };
};
/* eslint-enable sonarjs/cognitive-complexity, complexity */
