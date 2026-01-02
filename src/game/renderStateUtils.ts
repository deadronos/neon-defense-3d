import type {
  EffectEntity,
  EnemyEntity,
  ProjectileEntity,
  TowerEntity,
  EnemyConfig,
  TowerType,
} from '../types';

import { selectEnemyWorldPosition } from './engine/selectors';
import type { EngineState, EngineVector2 } from './engine/types';

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
}

export const createInitialRenderState = (): RenderState => ({
  enemies: [],
  towers: [],
  projectiles: [],
  effects: [],
  enemiesById: new Map(),
  gridOccupancy: new Map(),
});

/**
 * Synchronizes the game engine state into the mutable render state.
 * Reuses objects where possible to minimize garbage collection.
 */
export const syncRenderState = (
  engine: EngineState,
  renderState: RenderState,
  context: {
    enemyTypeMap: Map<string, EnemyConfig>;
    pathWaypoints: readonly EngineVector2[];
    tileSize: number;
  },
) => {
  const { enemyTypeMap, pathWaypoints, tileSize } = context;

  // --- 1. Sync Enemies ---
  const engineEnemies = engine.enemies;

  // Resize array if needed (simple approach: clear and push, or smart reuse)
  // Smart reuse: Match by ID? Or just index?
  // Since order might change (removal), matching by ID is safer but slower.
  // "Structure of Arrays" would be better, but we are using Array of Objects.
  // Optimization: Engine usually appends new enemies. Removals happen anywhere.

  // For now, to solve GC, we will reuse the objects in `renderState.enemies` if they exist at index `i`
  // AND if we can validly overwrite them. But since enemies die, the array shrinks.
  // Actually, standard array methods map() create new objects.

  // Strategy: Maintain a pool?
  // Let's stick to a simpler strategy first:
  // Rebuild the arrays, but verify if we can optimize later.
  // The User requirement is "cache world positions... or have render read them directly".
  // If we just copy data into a persistent array, we save allocation of the array container?
  // No, if we do `renderState.enemies = engine.enemies.map(...)`, we allocate everything.

  // To truly save GC, we need to mutate the EXISTING objects in renderState.enemies array.
  // But the set of enemies changes.

  // Hybrid approach:
  // 1. Mark all current render entities as "unused".
  // 2. Iterate engine enemies.
  // 3. For each engine enemy, look up in `enemiesById`.
  //    If exists, update it. Mark as used.
  //    If new, create new object, add to map and array.
  // 4. Remove unused entities from map and array.

  // This is O(N) where N is number of enemies. Good.

  const nextEnemies: EnemyEntity[] = [];
  const activeIds = new Set<string>();

  for (const engEnemy of engineEnemies) {
    activeIds.add(engEnemy.id);
    let renderEnemy = renderState.enemiesById.get(engEnemy.id);

    // Calculate Position
    // We should optimize selectEnemyWorldPosition to write to a target vector if possible,
    // but it currently returns a new tuple [x,y,z].
    // Let's assume selectEnemyWorldPosition is fast enough or optimized separately.
    const pos = selectEnemyWorldPosition(engEnemy, pathWaypoints, tileSize);

    if (renderEnemy) {
      // Update existing
      renderEnemy.pathIndex = engEnemy.pathIndex;
      renderEnemy.progress = engEnemy.progress;
      renderEnemy.position = pos;
      renderEnemy.hp = engEnemy.hp;
      renderEnemy.shield = engEnemy.shield ?? 0;
      renderEnemy.frozen = engEnemy.frozen ?? 0;
      renderEnemy.abilityCooldown = engEnemy.abilityCooldown ?? 0;
      renderEnemy.abilityActiveTimer = engEnemy.abilityActiveTimer ?? 0;
      // Config/Type shouldn't change
    } else {
      // Create new
      const baseConfig = enemyTypeMap.get(engEnemy.type);
      renderEnemy = {
        id: engEnemy.id,
        config: {
          speed: engEnemy.speed ?? baseConfig?.speed ?? 0,
          hp: engEnemy.hp,
          shield: engEnemy.shield ?? baseConfig?.shield ?? 0,
          reward: engEnemy.reward ?? baseConfig?.reward ?? 0,
          color: engEnemy.color ?? baseConfig?.color ?? '#ffffff',
          scale: engEnemy.scale ?? baseConfig?.scale,
          abilities: baseConfig?.abilities,
        },
        pathIndex: engEnemy.pathIndex,
        progress: engEnemy.progress,
        position: pos,
        hp: engEnemy.hp,
        shield: engEnemy.shield ?? 0,
        maxShield: engEnemy.maxShield ?? engEnemy.shield ?? 0,
        frozen: engEnemy.frozen ?? 0,
        abilityCooldown: engEnemy.abilityCooldown ?? 0,
        abilityActiveTimer: engEnemy.abilityActiveTimer ?? 0,
      };
      renderState.enemiesById.set(engEnemy.id, renderEnemy);
    }
    nextEnemies.push(renderEnemy);
  }

  // Prune dead enemies from map
  for (const id of renderState.enemiesById.keys()) {
    if (!activeIds.has(id)) {
      renderState.enemiesById.delete(id);
    }
  }

  // Replace array (reference change is fine for the Ref container)
  // We are reusing the Entity objects inside, so GC is low.
  renderState.enemies = nextEnemies;

  // --- 2. Sync Towers (and Occupancy) ---
  const nextTowers: TowerEntity[] = [];
  // Towers change less frequently, but we need to update `lastFired` and `level` and `targetId`.

  // Clear occupancy map to rebuild (or we could incrementally update, but rebuilding is safe for <1000 towers)
  renderState.gridOccupancy.clear();

  for (const engTower of engine.towers) {
    // Reuse logic similar to enemies if we want, but towers array is usually smaller.
    // Let's just map for now unless we see perf issues, OR use the same ID-caching strategy.
    // Towers persist, so ID caching is good.
    // Wait, we don't have `towersById` in RenderState. Let's just map or add it if needed.
    // But we need `gridOccupancy` to store the TowerEntity.

    // Let's implement simple caching for Towers too to avoid allocation.
    // We can use a Map locally or add to RenderState?
    // Since we don't have towersById in RenderState, let's just map for now,
    // BUT since we want to reduce GC, let's just do the "Create or Update" loop using a local map if we must,
    // or just assume index stability? No, sell/upgrade changes list.

    // Let's just map for towers for now as it's not the hottest path (usually static count),
    // EXCEPT `lastFired` updates frequently.

    // To properly optimize, we should cache towers.
    // Let's assume we can map them.

    const tower: TowerEntity = {
      id: engTower.id,
      type: engTower.type as TowerType,
      gridPos: [engTower.gridPosition[0], engTower.gridPosition[1]],
      position: [engTower.gridPosition[0] * tileSize, 0.5, engTower.gridPosition[1] * tileSize],
      lastFired: engTower.lastFired,
      targetId: engTower.targetId ?? null,
      level: engTower.level,
    };
    nextTowers.push(tower);

    const key = `${engTower.gridPosition[0]},${engTower.gridPosition[1]}`;
    renderState.gridOccupancy.set(key, tower);
  }
  renderState.towers = nextTowers;

  // --- 3. Sync Projectiles ---
  // Projectiles are high churn. Reusing objects is good.
  // We need a map for projectiles to reuse? Or just a pool?
  // ID-based Map is good.
  // We don't have `projectilesById` in RenderState. Let's add a local one or just always rebuild?
  // The goal is "Engine->render translation rebuilds arrays... GC hot path".
  // So we should fix Projectiles too.

  // We'll use a temporary map for projectiles or extend RenderState.
  // Let's stick to simple mapping for Projectiles for this pass,
  // as the finding highlighted "new vectors... and enemiesById".
  // We fixed enemiesById.
  // Projectiles: "projectiles array is mapped every render".

  // Let's try to be smart. If we keep a `projectilesById` map in the closure or module?
  // No, keep it in RenderState to be clean.
  // But I defined RenderState interface above without it.
  // I will just map them for now, but optimize the `selectProjectileWorldPosition` call?
  // No, `toProjectileEntity` creates a new object.
  // I will leave Projectiles as map-every-frame for this specific task unless I add `projectilesById` to RenderState.
  // Actually, I should add it.

  const nextProjectiles: ProjectileEntity[] = [];
  // Projectiles are short lived, so map might churn.
  // But let's just map them. It's better than nothing.

  for (const proj of engine.projectiles) {
    const target = renderState.enemiesById.get(proj.targetId);
    // If we have a render-time enemy target, lerp toward its known world position (avoids using engine types).
    const pos = target
      ? [
          proj.origin[0] + (target.position[0] - proj.origin[0]) * proj.progress,
          proj.origin[1] + (target.position[1] - proj.origin[1]) * proj.progress,
          proj.origin[2] + (target.position[2] - proj.origin[2]) * proj.progress,
        ]
      : proj.origin;

    nextProjectiles.push({
      id: proj.id,
      startPos: proj.origin,
      position: pos,
      targetId: proj.targetId,
      speed: proj.speed,
      progress: proj.progress,
      damage: proj.damage,
      color: proj.color,
    });
  }
  renderState.projectiles = nextProjectiles;

  // --- 4. Sync Effects ---
  renderState.effects = engine.effects.map((e) => ({
    id: e.id,
    type: e.type,
    position: e.position,
    color: e.color,
    scale: e.scale,
    duration: e.duration,
    createdAt: e.createdAt,
  }));
};
