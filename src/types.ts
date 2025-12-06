import type { Vector3 } from 'three';

export type Vector2 = [number, number];

export interface GameState {
  money: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  gameStatus: 'idle' | 'playing' | 'gameover';
}

export interface EnemyConfig {
  speed: number;
  hp: number;
  reward: number;
  color: string;
  scale?: number;
  abilities?: string[] | undefined;
}

export interface EnemyEntity {
  id: string;
  config: EnemyConfig;
  pathIndex: number;
  progress: number;
  position: Vector3;
  hp: number;
  frozen: number;
  abilityCooldown: number;
  abilityActiveTimer: number;
}

export interface ProjectileEntity {
  id: string;
  startPos: Vector3;
  targetId: string | null;
  speed: number;
  progress: number;
  damage: number;
  color: string;
}

export enum TowerType {
  Basic = 'Basic',
  Rapid = 'Rapid',
  Sniper = 'Sniper',
}

export interface TowerEntity {
  id: string;
  type: TowerType;
  gridPos: Vector2;
  position: Vector3;
  lastFired: number;
  targetId: string | null;
  level: number;
}

export interface EffectEntity {
  id: string;
  type?: string;
  position: Vector3;
  color?: string;
  scale?: number;
  createdAt?: number;
  duration?: number;
}

export enum TileType {
  Grass = 0,
  Path = 1,
  Spawn = 2,
  Base = 3,
}
