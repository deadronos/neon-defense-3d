import type { EngineCache } from './step';

export const resetEnemyPositionsCache = (cache: EngineCache): void => {
  for (const position of cache.enemyPositions.values()) {
    cache.enemyPositionPool.push(position);
  }
  cache.enemyPositions.clear();
  cache.enemyPositionsSource = undefined;
};
