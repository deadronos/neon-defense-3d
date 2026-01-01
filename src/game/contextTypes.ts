import type {
  EnemyEntity,
  GameState,
  GraphicsQuality,
  ProjectileEntity,
  TowerEntity,
  TowerType,
  EffectEntity,
  WaveState,
  TileType,
  Vector2,
  UpgradeType,
} from '../types';

import type { SaveV1 } from './persistence';

/**
 * Interface defining the properties and methods available in the GameContext.
 */
export interface GameContextProps {
  /** Current global game state (money, lives, wave, etc). */
  gameState: GameState;
  /** List of currently active enemies. */
  enemies: EnemyEntity[];
  /** List of placed towers. */
  towers: TowerEntity[];
  /** List of active projectiles. */
  projectiles: ProjectileEntity[];
  /** List of visual effects. */
  effects: EffectEntity[];
  /** Current state of the wave system. */
  waveState: WaveState | null;
  /** Steps the simulation (called from the render-loop bridge). */
  step: (deltaSeconds: number, nowSeconds: number) => void;
  /** Renderer intent: remove an effect by id. */
  removeEffect: (id: string) => void;
  /**
   * Places a tower on the grid.
   * @param x - The x-coordinate of the grid.
   * @param z - The z-coordinate of the grid.
   * @param type - The type of tower to place.
   */
  placeTower: (x: number, z: number, type: TowerType) => void;
  /** Starts the game session. */
  startGame: () => void;
  /** Resets the game to its initial state. */
  resetGame: () => void;
  /** Currently selected tower type for building (null if none). */
  selectedTower: TowerType | null;
  /** Sets the currently selected tower type for building. */
  setSelectedTower: (t: TowerType | null) => void;
  /** ID of the currently selected tower entity (for upgrading/selling). */
  selectedEntityId: string | null;
  /** Sets the ID of the selected tower entity. */
  setSelectedEntityId: (id: string | null) => void;
  /**
   * Upgrades a specific tower.
   * @param id - The ID of the tower to upgrade.
   */
  upgradeTower: (id: string) => void;
  /**
   * Sells a specific tower.
   * @param id - The ID of the tower to sell.
   */
  sellTower: (id: string) => void;

  /**
   * Checks if a tower can be placed at the given coordinates.
   * @param x - The x-coordinate of the grid.
   * @param z - The z-coordinate of the grid.
   * @returns True if placement is valid, false otherwise.
   */
  isValidPlacement: (x: number, z: number) => boolean;
  /** Current Map Grid. */
  mapGrid: TileType[][];
  /** Current Path Waypoints. */
  pathWaypoints: Vector2[];
  /** Advance to the next sector (map). */
  startNextSector: () => void;
  /** Purchase an upgrade. */
  purchaseUpgrade: (type: UpgradeType, cost: number) => void;

  /** Sets renderer quality preset (High/Low). */
  setGraphicsQuality: (quality: GraphicsQuality) => void;

  /** Reloads the most recent autosaved checkpoint (disabled when none exists). */
  resetCheckpoint: () => { ok: boolean; error?: string };

  /** Wipes all progress/meta and resets the engine, preserving the current quality setting. */
  factoryReset: () => void;

  /** Applies a validated checkpoint save payload to the current runtime. */
  applyCheckpointSave: (save: SaveV1) => void;

  /** Returns JSON for export (latest checkpoint if present; otherwise a live snapshot). */
  exportCheckpointJson: () => { json: string; hasCheckpoint: boolean };
  skipWave: () => void;
  /** Current game speed multiplier (1x, 2x, 4x). */
  gameSpeed: number;
  /** Sets the game speed multiplier. */
  setGameSpeed: (speed: number) => void;
}
