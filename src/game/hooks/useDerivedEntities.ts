import { useMemo } from 'react';

import { MAP_LAYOUTS, generatePath, getMapGrid } from '../../constants';
import type { EngineEnemy, EngineVector2 } from '../engine/types';
import type { RuntimeStoreState } from '../stores/runtimeStore';
import {
  buildEnemyTypeMap,
  toEffectEntity,
  toEnemyEntity,
  toProjectileEntity,
  toTowerEntity,
  toWaveState,
} from '../transforms';

export const useDerivedEntities = (runtime: RuntimeStoreState['runtime']) => {
  const enemyTypeMap = useMemo(buildEnemyTypeMap, []);

  const currentMapLayout = MAP_LAYOUTS[runtime.ui.currentMapIndex % MAP_LAYOUTS.length];
  const mapGrid = useMemo(() => getMapGrid(currentMapLayout), [currentMapLayout]);
  const pathWaypoints = useMemo(() => generatePath(currentMapLayout), [currentMapLayout]);
  const enginePathWaypoints: readonly EngineVector2[] = pathWaypoints;

  const enemies = useMemo(
    () =>
      runtime.engine.enemies.map((enemy) =>
        toEnemyEntity(enemy, enemyTypeMap, enginePathWaypoints),
      ),
    [runtime.engine.enemies, enemyTypeMap, enginePathWaypoints],
  );

  const enemiesById = useMemo(() => {
    const map = new Map<string, EngineEnemy>();
    for (const enemy of runtime.engine.enemies) {
      map.set(enemy.id, enemy);
    }
    return map;
  }, [runtime.engine.enemies]);

  const towers = useMemo(
    () => runtime.engine.towers.map((tower) => toTowerEntity(tower)),
    [runtime.engine.towers],
  );

  const projectiles = useMemo(
    () =>
      runtime.engine.projectiles.map((projectile) =>
        toProjectileEntity(projectile, enemiesById, enginePathWaypoints),
      ),
    [runtime.engine.projectiles, enemiesById, enginePathWaypoints],
  );

  const effects = useMemo(
    () => runtime.engine.effects.map((effect) => toEffectEntity(effect)),
    [runtime.engine.effects],
  );

  const waveState = useMemo(() => toWaveState(runtime.engine.wave), [runtime.engine.wave]);

  return {
    enemyTypeMap,
    mapGrid,
    pathWaypoints,
    enginePathWaypoints,
    enemies,
    towers,
    projectiles,
    effects,
    waveState,
  };
};
