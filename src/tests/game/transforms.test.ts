import { describe, it, expect } from 'vitest';

import { MAP_LAYOUTS, TILE_SIZE } from '../../constants';
import type {
  EngineEnemy,
  EngineProjectile,
  EngineTower,
  EngineVector2,
  EngineVector3,
  EngineWaveState,
} from '../../game/engine/types';
import {
  buildEnemyTypeMap,
  toWaveState,
  toEnemyEntity,
  toProjectileEntity,
  toTowerEntity,
} from '../../game/transforms';

const pathWaypoints: EngineVector2[] = MAP_LAYOUTS[0].map((_row, z) => [0, z] as EngineVector2);

describe('transforms', () => {
  it('buildEnemyTypeMap contains Drone entry', () => {
    const map = buildEnemyTypeMap();
    expect(map.has('Drone')).toBe(true);
    const cfg = map.get('Drone');
    expect(cfg).toHaveProperty('speed');
    expect(cfg).toHaveProperty('hp');
  });

  it('toWaveState converts engine wave to UI wave state', () => {
    const wave: EngineWaveState = {
      wave: 3,
      phase: 'active' as const,
      enemiesRemainingToSpawn: 5,
      enemiesAlive: 2,
      timerMs: 2500,
      spawnIntervalMs: 2000,
    };
    const ws = toWaveState(wave);
    expect(ws).not.toBeNull();
    expect(ws?.timer).toBeCloseTo(2.5);
    expect(ws?.wave).toBe(3);
  });

  it('toEnemyEntity converts engine enemy and computes position', () => {
    const map = buildEnemyTypeMap();
    const enemy: EngineEnemy = {
      id: 'e1',
      type: 'Drone',
      pathIndex: 0,
      progress: 0.5,
      hp: 200,
    };
    const ent = toEnemyEntity(enemy, map, pathWaypoints);
    expect(ent.id).toBe('e1');
    expect(ent.position[1]).toBe(1); // y is fixed at 1 in selector
  });

  it('toProjectileEntity computes position when target provided', () => {
    const enemy: EngineEnemy = {
      id: 'e1',
      type: 'Drone',
      pathIndex: 0,
      progress: 0.0,
      hp: 200,
    };
    const enemiesById = new Map<string, EngineEnemy>([['e1', enemy]]);
    const projectile: EngineProjectile = {
      id: 'p1',
      origin: [0, 1, 0] as EngineVector3,
      targetId: 'e1',
      speed: 1,
      progress: 0.5,
      damage: 10,
      color: '#fff',
    };
    const ent = toProjectileEntity(projectile, enemiesById, pathWaypoints);
    expect(ent.position.length).toBe(3);
  });

  it('toTowerEntity converts engine tower and computes world position', () => {
    const tower: EngineTower = {
      id: 't1',
      type: 'Basic',
      level: 1,
      gridPosition: [2, 3],
      lastFired: 0,
    };
    const ent = toTowerEntity(tower);
    expect(ent.gridPos[0]).toBe(2);
    expect(ent.position[0]).toBe(2 * TILE_SIZE);
  });
});
