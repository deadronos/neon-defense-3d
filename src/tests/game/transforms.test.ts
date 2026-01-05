import { describe, it, expect } from 'vitest';
import { buildEnemyTypeMap, toWaveState, toEnemyEntity, toProjectileEntity, toTowerEntity } from '../../game/transforms';
import { MAP_LAYOUTS, TILE_SIZE } from '../../constants';

const pathWaypoints = MAP_LAYOUTS[0].map((row, z) => row.map((_, x) => [x, z] as [number, number])[0]).filter(Boolean);

describe('transforms', () => {
  it('buildEnemyTypeMap contains Drone entry', () => {
    const map = buildEnemyTypeMap();
    expect(map.has('Drone')).toBe(true);
    const cfg = map.get('Drone');
    expect(cfg).toHaveProperty('speed');
    expect(cfg).toHaveProperty('hp');
  });

  it('toWaveState converts engine wave to UI wave state', () => {
    const wave = { wave: 3, phase: 'active' as const, enemiesRemainingToSpawn: 5, enemiesAlive: 2, timerMs: 2500, spawnIntervalMs: 2000 };
    const ws = toWaveState(wave as any);
    expect(ws).not.toBeNull();
    expect(ws?.timer).toBeCloseTo(2.5);
    expect(ws?.wave).toBe(3);
  });

  it('toEnemyEntity converts engine enemy and computes position', () => {
    const map = buildEnemyTypeMap();
    const enemy = { id: 'e1', type: 'Drone', pathIndex: 0, progress: 0.5, hp: 20 } as any;
    const ent = toEnemyEntity(enemy, map, pathWaypoints as any);
    expect(ent.id).toBe('e1');
    expect(ent.position[1]).toBe(1); // y is fixed at 1 in selector
  });

  it('toProjectileEntity computes position when target provided', () => {
    const enemy = { id: 'e1', type: 'Drone', pathIndex: 0, progress: 0.0, hp: 20 } as any;
    const enemiesById = new Map<string, any>([['e1', enemy]]);
    const projectile = { id: 'p1', origin: [0, 1, 0] as any, targetId: 'e1', speed: 1, progress: 0.5, damage: 10, color: '#fff' } as any;
    const ent = toProjectileEntity(projectile, enemiesById as any, pathWaypoints as any);
    expect(ent.position.length).toBe(3);
  });

  it('toTowerEntity converts engine tower and computes world position', () => {
    const tower = { id: 't1', type: 'Basic', level: 1, gridPosition: [2, 3], lastFired: 0 } as any;
    const ent = toTowerEntity(tower as any);
    expect(ent.gridPos[0]).toBe(2);
    expect(ent.position[0]).toBe(2 * TILE_SIZE);
  });
});