import { useMemo } from 'react';

import { MAP_LAYOUTS, generatePath, getMapGrid } from '../../constants';
import type { EngineEnemy, EngineVector2 } from '../engine/types';
import type { RuntimeState } from '../stores/runtimeReducer';
import {
  buildEnemyTypeMap,
  toEffectEntity,
  toEnemyEntity,
  toProjectileEntity,
  toTowerEntity,
  toWaveState,
} from '../transforms';

export const useGameMap = (ui: RuntimeState['ui']) => {
  const enemyTypeMap = useMemo(buildEnemyTypeMap, []);

  const mapLayout =
    ui.currentMapIndex >= 0
      ? MAP_LAYOUTS[ui.currentMapIndex % MAP_LAYOUTS.length]
      : (ui.customMapLayout ?? MAP_LAYOUTS[0]);

  const mapGrid = useMemo(() => getMapGrid(mapLayout), [mapLayout]);
  const pathWaypoints = useMemo(() => generatePath(mapLayout), [mapLayout]);
  const enginePathWaypoints: readonly EngineVector2[] = pathWaypoints;

  return { enemyTypeMap, mapGrid, pathWaypoints, enginePathWaypoints };
};

export const useDerivedEntities = (
  engine: RuntimeState['engine'],
  enemyTypeMap: ReturnType<typeof buildEnemyTypeMap>,
  enginePathWaypoints: readonly EngineVector2[],
) => {
  const enemies = useMemo(
    () => engine.enemies.map((enemy) => toEnemyEntity(enemy, enemyTypeMap, enginePathWaypoints)),
    [engine.enemies, enemyTypeMap, enginePathWaypoints],
  );

  const enemiesById = useMemo(() => {
    const map = new Map<string, EngineEnemy>();
    for (const enemy of engine.enemies) {
      map.set(enemy.id, enemy);
    }
    return map;
  }, [engine.enemies]);

  const towers = useMemo(() => engine.towers.map((tower) => toTowerEntity(tower)), [engine.towers]);

  const projectiles = useMemo(
    () =>
      engine.projectiles.map((projectile) =>
        toProjectileEntity(projectile, enemiesById, enginePathWaypoints),
      ),
    [engine.projectiles, enemiesById, enginePathWaypoints],
  );

  const effects = useMemo(
    () => engine.effects.map((effect) => toEffectEntity(effect)),
    [engine.effects],
  );

  const waveState = useMemo(() => toWaveState(engine.wave), [engine.wave]);

  return {
    enemies,
    towers,
    projectiles,
    effects,
    waveState,
  };
};
