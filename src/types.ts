/**
 * Represents a 2D vector as a tuple of [x, y] coordinates.
 */
export type Vector2 = [number, number];

/**
 * Represents a 3D vector as a tuple of [x, y, z] coordinates.
 */
export type Position3 = readonly [number, number, number];

/** Renderer quality preset for performance tuning. */
export type GraphicsQuality = 'high' | 'low';

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
  /** Monotonic marker incremented only when a WaveStarted engine event is applied. */
  waveStartedNonce: number;
  /** Last wave number observed in a WaveStarted engine event (diagnostic). */
  lastWaveStartedWave: number;
  /** Boolean indicating if the game loop is currently running (enemies moving, etc). */
  isPlaying: boolean;
  /** Whether the game has reached a terminal game over state. */
  isGameOver?: boolean;
  /** Current status of the game session. */
  gameStatus: 'idle' | 'playing' | 'gameover' | 'victory'; // Added 'victory'

  /** Currently selected entity id for inspectors or null. */
  selectedEntityId: string | null;
  /** Currently selected tower type when placing; null otherwise. */
  selectedTower: TowerType | null;

  /** Graphics quality preset (affects postprocessing, trails, etc.). */
  graphicsQuality: GraphicsQuality;

  /** Index of the current map in the campaign. */
  currentMapIndex: number;

  // Campaign & Tech Tree
  researchPoints: number;
  totalDamageDealt: number;
  totalCurrencyEarned: number;
  upgrades: {
    [key in UpgradeType]?: number; // Level of each upgrade
  };

  /**
   * Incremented whenever a major state change (like loading a save) requires
   * a full remount of the game scene components.
   */
  sessionNonce: number;
  /** Kill streak / announcer payload (null when hidden). */
  announcement: {
    text: string;
    subtext?: string;
    id: number;
  } | null;
}

export const UpgradeType = {
  GLOBAL_DAMAGE: 'GLOBAL_DAMAGE',
  GLOBAL_RANGE: 'GLOBAL_RANGE',
  GLOBAL_GREED: 'GLOBAL_GREED',
  // Per-tower or specific upgrades
  TOWER_DAMAGE: 'TOWER_DAMAGE',
  // Can add specific tower upgrades later if needed, generic for now
} as const;

export type UpgradeType = (typeof UpgradeType)[keyof typeof UpgradeType];

/**
 * Configuration settings for an enemy type.
 */
export interface EnemyConfig {
  /** Movement speed of the enemy in world units per second. */
  speed: number;
  /** Base hit points of the enemy. */
  hp: number;
  /** Base shield points of the enemy. */
  shield: number;
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
  position: Position3;
  /** Current hit points remaining. */
  hp: number;
  /** Current shield points remaining. */
  shield: number;
  /** Maximum shield points. */
  maxShield: number;
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
  startPos: Position3;
  /** Current world position of the projectile. */
  position: Position3;
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
export const TowerType = {
  /** Basic balanced tower. */
  Basic: 'Basic',
  /** High fire rate, low range tower. */
  Rapid: 'Rapid',
  /** Long range, high damage tower. */
  Sniper: 'Sniper',
  /** Slows enemies down. */
  Cryo: 'Cryo',
  /** Deals splash damage. */
  Missile: 'Missile',
} as const;

export type TowerType = (typeof TowerType)[keyof typeof TowerType];

/**
 * Configuration settings for a tower type.
 */
export interface TowerConfig {
  name: string;
  cost: number;
  range: number;
  damage: number;
  cooldown: number;
  color: string;
  description: string;
  freezeDuration?: number;
  splashRadius?: number;
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
  position: Position3;
  /** Timestamp of the last shot fired. */
  lastFired: number;
  /** ID of the current target enemy. */
  targetId: string | null;
  /** Upgrade level of the tower. */
  level: number;
  /** Active synergies affecting this tower. */
  activeSynergies?: ActiveSynergy[];
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
  position: Position3;
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
export const TileType = {
  /** Empty grass tile (buildable?). Usually non-path. */
  Grass: 0,
  /** Path tile where enemies walk. */
  Path: 1,
  /** Enemy spawn point. */
  Spawn: 2,
  /** Player base (destination). */
  Base: 3,
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

/**
 * Represents the current state of the wave system.
 */

export type WavePhase = 'preparing' | 'spawning' | 'active' | 'completed';

export interface WaveState {
  wave: number;
  phase: WavePhase;
  nextWaveTime: number; // Timestamp for when the next wave/phase starts
  enemiesAlive: number;
  enemiesRemainingToSpawn: number;
  /** Seconds remaining in current phase (if applicable). */
  timer: number;
}

export const SynergyType = {
  SYNCHRONIZED_FIRE: 'SYNCHRONIZED_FIRE',
  TRIANGULATION: 'TRIANGULATION',
  COVER_FIRE_SOURCE: 'COVER_FIRE_SOURCE',
  COVER_FIRE_RECEIVER: 'COVER_FIRE_RECEIVER',
} as const;

export type SynergyType = (typeof SynergyType)[keyof typeof SynergyType];

export interface ActiveSynergy {
  type: SynergyType;
  partnerId: string;
}
