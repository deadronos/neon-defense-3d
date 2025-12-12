import type { EngineEvent } from './events';

export type EngineVector2 = [number, number];
export type EngineVector3 = [number, number, number];

export interface EngineEnemy {
  id: string;
  type: string;
  pathIndex: number;
  progress: number;
  hp: number;
  shield?: number;
  maxShield?: number;
  speed?: number;
  reward?: number;
  color?: string;
  scale?: number;
  abilityCooldown?: number;
  abilityActiveTimer?: number;
  frozen?: number;
}

export interface EngineTower {
  id: string;
  type: string;
  level: number;
  gridPosition: EngineVector2;
  lastFired: number;
  targetId?: string;
}

export interface EngineProjectile {
  id: string;
  origin: EngineVector3;
  targetId: string;
  speed: number;
  progress: number;
  damage: number;
  color: string;
}

export interface EngineEffectIntent {
  id: string;
  type: string;
  position: EngineVector3;
  color?: string;
  scale?: number;
  duration?: number;
  createdAt?: number;
}

export interface EngineWaveState {
  wave: number;
  phase: 'preparing' | 'spawning' | 'active' | 'completed';
  enemiesRemainingToSpawn: number;
  enemiesAlive: number;
  timerMs: number;
  spawnIntervalMs: number;
}

export interface EngineIdCounters {
  enemy: number;
  projectile: number;
  effect: number;
}

export interface EngineState {
  enemies: EngineEnemy[];
  towers: EngineTower[];
  projectiles: EngineProjectile[];
  effects: EngineEffectIntent[];
  wave: EngineWaveState | null;
  idCounters: EngineIdCounters;
  pendingEvents: EngineEvent[];
}

export interface EnginePatch {
  enemies?: EngineEnemy[];
  towers?: EngineTower[];
  projectiles?: EngineProjectile[];
  effects?: EngineEffectIntent[];
  wave?: EngineWaveState | null;
  idCounters?: Partial<EngineIdCounters>;
  pendingEvents?: EngineEvent[];
}

export interface EngineEvents {
  immediate: EngineEvent[];
  deferred: EngineEvent[];
}

export interface EngineTickContext {
  deltaMs: number;
  nowMs: number;
  rng: () => number;
}

export interface EngineTickResult {
  patch: EnginePatch;
  events: EngineEvents;
}

export type EngineAction =
  | { type: 'applyTickResult'; result: EngineTickResult }
  | { type: 'removeEffect'; effectId: string };
