import type { EngineCache } from './step';
import type { EngineEnemy, EngineProjectile } from './types';

export const resetEnemyPositionsCache = (cache: EngineCache): void => {
  for (const position of cache.enemyPositions.values()) {
    cache.enemyPositionPool.push(position);
  }
  cache.enemyPositions.clear();
  cache.enemyPositionsSource = undefined;
};

export const getOrCreateProjectileCaches = (cache?: EngineCache) => {
  const hits = cache ? cache.projectileHits : new Map<string, number>();
  const freezeHits = cache ? cache.projectileFreeze : new Map<string, number>();
  const activeProjectiles = cache ? cache.activeProjectiles : ([] as EngineProjectile[]);
  const enemiesById = cache ? cache.enemiesById : new Map<string, EngineEnemy>();

  if (cache) {
    hits.clear();
    freezeHits.clear();
    activeProjectiles.length = 0;
    enemiesById.clear();
  }

  return {
    hits,
    freezeHits,
    activeProjectiles,
    enemiesById,
  };
};

export const getOrCreateNextEnemies = (cache?: EngineCache): EngineEnemy[] => {
  const nextEnemies = cache ? cache.nextEnemies : ([] as EngineEnemy[]);
  if (cache) nextEnemies.length = 0;
  return nextEnemies;
};
