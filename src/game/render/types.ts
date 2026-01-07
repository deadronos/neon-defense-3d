import type {
  EffectEntity,
  EnemyEntity,
  ProjectileEntity,
  TowerEntity,
  Position3,
} from '../../types';

/**
 * Mutable container for the latest render-ready state.
 * This object is updated every tick without triggering React renders for the data arrays.
 */
export interface RenderState {
  enemies: EnemyEntity[];
  towers: TowerEntity[];
  projectiles: ProjectileEntity[];
  effects: EffectEntity[];

  /** Map of enemy ID to EnemyEntity for quick lookup by projectiles/towers. */
  enemiesById: Map<string, EnemyEntity>;

  /** Map of "x,z" grid coordinates to TowerEntity for O(1) placement/selection checks. */
  gridOccupancy: Map<string, TowerEntity>;

  /** Previous frame positions for interpolation (enemy id -> position). */
  previousEnemyPositions: Map<string, Position3>;
  /** Previous frame positions for interpolation (projectile id -> position). */
  previousProjectilePositions: Map<string, Position3>;
  /** Last known projectile positions for interpolation. */
  projectilePositions: Map<string, Position3>;
  /** Render interpolation alpha (0-1). */
  renderAlpha: number;
}

export const createInitialRenderState = (): RenderState => ({
  enemies: [],
  towers: [],
  projectiles: [],
  effects: [],
  enemiesById: new Map(),
  gridOccupancy: new Map(),
  previousEnemyPositions: new Map(),
  previousProjectilePositions: new Map(),
  projectilePositions: new Map(),
  renderAlpha: 0,
});
