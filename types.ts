import { Vector3 } from 'three';

export type Vector2 = [number, number]; // x, z coordinates on grid

export enum TileType {
  Grass = 0,
  Path = 1,
  Spawn = 2,
  Base = 3,
  Obstacle = 4,
}

export enum TowerType {
  Basic = 'BASIC',
  Rapid = 'RAPID',
  Sniper = 'SNIPER',
}

export interface EnemyConfig {
  speed: number;
  hp: number;
  reward: number;
  color: string;
  scale?: number; // Visual scale factor
  abilities?: string[]; // List of special abilities e.g. ['dash']
}

export interface EnemyEntity {
  id: string;
  config: EnemyConfig;
  pathIndex: number; // The index of the path node they are targeting
  progress: number; // 0 to 1 between current node and next node
  position: Vector3; // Calculated world position
  hp: number;
  frozen: number; // Frozen timer
  abilityCooldown: number;
  abilityActiveTimer: number;
}

export interface TowerEntity {
  id: string;
  type: TowerType;
  gridPos: Vector2; // Grid coordinates
  position: Vector3; // World coordinates
  lastFired: number;
  targetId: string | null;
  level: number; // Current upgrade level (starts at 1)
}

export interface ProjectileEntity {
  id: string;
  startPos: Vector3;
  targetId: string;
  speed: number;
  progress: number; // 0 to 1
  color: string;
  damage: number;
}

export interface EffectEntity {
  id: string;
  type: 'explosion';
  position: Vector3;
  color: string;
  scale: number;
  createdAt: number;
  duration: number;
}

export interface Wave {
  count: number;
  interval: number;
  enemyHpMultiplier: number;
}

export interface GameState {
  money: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  gameStatus: 'idle' | 'playing' | 'gameover' | 'victory';
}