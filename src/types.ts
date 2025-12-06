import type { Vector3 } from 'three';

/**
 * Represents a 2D vector as a tuple of [x, y] coordinates.
 */
export type Vector2 = [number, number];

/**
 * Interface representing the global state of the game.
 */
export interface GameState {
  /** Current amount of money available to the player. */
  money: number;
  /** Current number of lives remaining. */
  lives: number;
  /** Current wave number. */
  wave: number;
  /** Boolean indicating if the game loop is currently running (enemies moving, etc). */
  isPlaying: boolean;
  /** Current status of the game session. */
  gameStatus: 'idle' | 'playing' | 'gameover';
}

/**
 * Configuration settings for an enemy type.
 */
export interface EnemyConfig {
  /** Movement speed of the enemy in world units per second. */
  speed: number;
  /** Base hit points of the enemy. */
  hp: number;
  /** Money reward for killing this enemy. */
  reward: number;
  /** Color of the enemy for rendering. */
  color: string;
  /** Visual scale of the enemy. */
  scale?: number;
  /** Optional list of special abilities (e.g., 'dash'). */
  abilities?: string[] | undefined;
}

/**
 * Represents an active enemy entity in the game world.
 */
export interface EnemyEntity {
  /** Unique identifier for the enemy instance. */
  id: string;
  /** Configuration settings for this enemy type. */
  config: EnemyConfig;
  /** Index of the current waypoint in the path. */
  pathIndex: number;
  /** Progress towards the next waypoint (0 to 1). */
  progress: number;
  /** Current 3D position of the enemy. */
  position: Vector3;
  /** Current hit points remaining. */
  hp: number;
  /** Timer for frozen status effect (0 if not frozen). */
  frozen: number;
  /** Cooldown timer for enemy ability usage. */
  abilityCooldown: number;
  /** Timer for active duration of an ability. */
  abilityActiveTimer: number;
}

/**
 * Represents an active projectile entity.
 */
export interface ProjectileEntity {
  /** Unique identifier for the projectile. */
  id: string;
  /** Starting position of the projectile. */
  startPos: Vector3;
  /** ID of the target enemy. */
  targetId: string | null;
  /** Speed of the projectile. */
  speed: number;
  /** Progress of the projectile towards the target (0 to 1). */
  progress: number;
  /** Damage dealt by the projectile. */
  damage: number;
  /** Color of the projectile. */
  color: string;
}

/**
 * Enum defining the available tower types.
 */
export enum TowerType {
  /** Basic balanced tower. */
  Basic = 'Basic',
  /** High fire rate, low range tower. */
  Rapid = 'Rapid',
  /** Long range, high damage tower. */
  Sniper = 'Sniper',
}

/**
 * Represents an active tower entity placed on the grid.
 */
export interface TowerEntity {
  /** Unique identifier for the tower. */
  id: string;
  /** Type of the tower. */
  type: TowerType;
  /** Grid coordinates [x, z] where the tower is placed. */
  gridPos: Vector2;
  /** World position of the tower. */
  position: Vector3;
  /** Timestamp of the last shot fired. */
  lastFired: number;
  /** ID of the current target enemy. */
  targetId: string | null;
  /** Upgrade level of the tower. */
  level: number;
}

/**
 * Represents a visual effect entity (particles, explosions, etc.).
 */
export interface EffectEntity {
  /** Unique identifier for the effect. */
  id: string;
  /** Type of the effect (optional). */
  type?: string;
  /** World position of the effect. */
  position: Vector3;
  /** Color of the effect. */
  color?: string;
  /** Visual scale of the effect. */
  scale?: number;
  /** Timestamp when the effect was created. */
  createdAt?: number;
  /** Duration of the effect in seconds. */
  duration?: number;
}

/**
 * Enum defining the types of tiles in the map grid.
 */
export enum TileType {
  /** Empty grass tile (buildable?). Usually non-path. */
  Grass = 0,
  /** Path tile where enemies walk. */
  Path = 1,
  /** Enemy spawn point. */
  Spawn = 2,
  /** Player base (destination). */
  Base = 3,
}
