import { describe, it, expect } from 'vitest';

import { TILE_SIZE, MAP_LAYOUTS } from '../../constants';
import type { EngineState } from '../../game/engine/types';
import { createInitialRenderState, syncRenderState } from '../../game/renderStateUtils';
import type { EnemyConfig } from '../../types';

const pathWaypoints = MAP_LAYOUTS[0]
  .map((row, z) => row.map((_, x) => [x, z] as [number, number])[0])
  .filter(Boolean);

describe('renderStateUtils.syncRenderState', () => {
  it('syncs enemies, towers, projectiles, and effects into render state', () => {
    const renderState = createInitialRenderState();
    const enemyTypeMap = new Map<string, EnemyConfig>([
      ['Drone', { speed: 2.5, hp: 50, shield: 0, reward: 10, color: '#ff0055', scale: 0.4 }],
    ]);

    const engineState: EngineState = {
      enemies: [
        {
          id: 'e1',
          type: 'Drone',
          pathIndex: 0,
          progress: 0.5,
          hp: 50,
        },
      ],
      towers: [
        {
          id: 't1',
          type: 'Basic',
          level: 1,
          gridPosition: [1, 2],
          lastFired: 0,
        },
      ],
      projectiles: [
        {
          id: 'p1',
          origin: [0, 1, 0],
          targetId: 'e1',
          speed: 1,
          progress: 0.5,
          damage: 10,
          color: '#fff',
        },
      ],
      effects: [
        {
          id: 'fx1',
          type: 'explosion',
          position: [1, 0, 1],
          color: '#fff',
          scale: 1,
          duration: 100,
          createdAt: Date.now(),
        },
      ],
      wave: null,
      idCounters: { enemy: 0, tower: 0, projectile: 0, effect: 0 },
      pendingEvents: [],
    };

    syncRenderState(engineState, renderState, { enemyTypeMap, pathWaypoints, tileSize: TILE_SIZE });

    // Enemies
    expect(renderState.enemies.length).toBe(1);
    const e = renderState.enemies[0];
    expect(e.id).toBe('e1');
    expect(renderState.enemiesById.get('e1')).toBe(e);
    expect(renderState.previousEnemyPositions.has('e1')).toBe(true);

    // Towers & occupancy
    expect(renderState.towers.length).toBe(1);
    const t = renderState.towers[0];
    expect(renderState.gridOccupancy.get('1,2')).toBe(t);

    // Projectiles
    expect(renderState.projectiles.length).toBe(1);
    const p = renderState.projectiles[0];
    expect(renderState.projectilePositions.get('p1')).toEqual(p.position);
    expect(renderState.previousProjectilePositions.has('p1')).toBe(true);

    // Effects
    expect(renderState.effects.length).toBe(1);
  });

  it('removes previous positions when entities are no longer present', () => {
    const renderState = createInitialRenderState();
    const enemyTypeMap = new Map<string, EnemyConfig>([
      ['Drone', { speed: 2.5, hp: 50, shield: 0, reward: 10, color: '#ff0055', scale: 0.4 }],
    ]);

    const engineStateA: EngineState = {
      enemies: [{ id: 'e1', type: 'Drone', pathIndex: 0, progress: 0.1, hp: 50 }],
      towers: [],
      projectiles: [],
      effects: [],
      wave: null,
      idCounters: { enemy: 0, tower: 0, projectile: 0, effect: 0 },
      pendingEvents: [],
    };
    syncRenderState(engineStateA, renderState, {
      enemyTypeMap,
      pathWaypoints,
      tileSize: TILE_SIZE,
    });
    expect(renderState.previousEnemyPositions.has('e1')).toBe(true);

    // Now sync with empty enemies
    const engineStateB = { ...engineStateA, enemies: [] };
    syncRenderState(engineStateB, renderState, {
      enemyTypeMap,
      pathWaypoints,
      tileSize: TILE_SIZE,
    });

    expect(renderState.enemies.length).toBe(0);
    expect(renderState.previousEnemyPositions.has('e1')).toBe(false);
  });
});
