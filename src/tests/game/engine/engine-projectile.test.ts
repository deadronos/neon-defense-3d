import { describe, expect, it } from 'vitest';

import { stepProjectiles } from '../../../game/engine/projectile';
import { createInitialEngineState } from '../../../game/engine/state';

/* eslint-disable max-lines-per-function */

const path: [number, number][] = [
  [0, 0],
  [1, 0],
];

describe('engine stepProjectiles', () => {
  it('resolves hits, kills enemies, spawns effects, and defers rewards', () => {
    const state = {
      ...createInitialEngineState(),
      enemies: [
        {
          id: 'enemy-1',
          type: 'Drone',
          pathIndex: 0,
          progress: 0,
          hp: 10,
          shield: 0,
          reward: 10,
          color: '#ff0055',
          scale: 0.4,
        },
      ],
      projectiles: [
        {
          id: 'projectile-1',
          origin: [0, 2, 0] as [number, number, number],
          targetId: 'enemy-1',
          speed: 20,
          progress: 0.99,
          damage: 50,
          color: '#fff',
        },
      ],
    };

    const result = stepProjectiles(
      state,
      path,
      { deltaMs: 100, nowMs: 2000, rng: () => 0.5 },
      { tileSize: 2, greedMultiplier: 1.1 },
    );

    expect(result.patch.projectiles).toEqual([]);
    expect(result.patch.enemies).toEqual([]);
    expect(result.patch.effects).toHaveLength(1);
    expect(result.patch.effects?.[0]?.id).toBe('effect-1');
    expect(result.patch.effects?.[0]?.type).toBe('explosion');
    expect(result.patch.effects?.[0]?.position).toEqual([0, 1, 0]);
    expect(result.patch.effects?.[0]?.createdAt).toBe(2);
    expect(result.patch.idCounters).toEqual({ effect: 1 });

    expect(result.events.immediate).toEqual([]);
    expect(result.events.deferred).toEqual([
      { type: 'EnemyKilled', enemyId: 'enemy-1', reward: 11 },
      { type: 'DamageDealt', amount: 50 },
    ]);
  });

  it('applies splash damage to nearby enemies', () => {
    const enemy1 = {
      id: 'enemy-1',
      type: 'Drone',
      pathIndex: 0,
      progress: 0, // Pos [0,0,0]
      hp: 100,
      shield: 0,
      reward: 10,
    };
    const enemy2 = {
      id: 'enemy-2',
      type: 'Drone',
      pathIndex: 0,
      progress: 0.1, // Pos near [0,0,0]. dist = 0.1 * 2 = 0.2
      hp: 100,
      shield: 0,
      reward: 10,
    };

    const state = {
      ...createInitialEngineState(),
      enemies: [enemy1, enemy2],
      projectiles: [
        {
          id: 'proj-1',
          origin: [0, 2, 0] as [number, number, number],
          targetId: 'enemy-1',
          speed: 20,
          progress: 0.99,
          damage: 50,
          color: '#fff',
          splashRadius: 1.0,
        },
      ],
    };

    const result = stepProjectiles(
      state,
      path,
      { deltaMs: 100, nowMs: 2000, rng: () => 0.5 },
      { tileSize: 2 },
    );

    expect(result.patch.enemies).toHaveLength(2);
    expect(result.patch.enemies?.[0].hp).toBe(50);
    expect(result.patch.enemies?.[1].hp).toBe(50);
    expect(result.events.deferred).toContainEqual({ type: 'DamageDealt', amount: 100 });
  });

  it('applies shield damage before HP damage', () => {
    const state = {
      ...createInitialEngineState(),
      enemies: [
        {
          id: 'enemy-1',
          type: 'Drone',
          pathIndex: 0,
          progress: 0,
          hp: 100,
          shield: 20,
          reward: 10,
        },
      ],
      projectiles: [
        {
          id: 'projectile-1',
          origin: [0, 2, 0] as [number, number, number],
          targetId: 'enemy-1',
          speed: 20,
          progress: 0.99,
          damage: 10,
          color: '#fff',
        },
      ],
    };

    const result = stepProjectiles(
      state,
      path,
      { deltaMs: 100, nowMs: 2000, rng: () => 0.5 },
      { tileSize: 2 },
    );

    expect(result.patch.enemies).toHaveLength(1);
    const enemy = result.patch.enemies?.[0];
    expect(enemy?.shield).toBe(10);
    expect(enemy?.hp).toBe(100);
    expect(result.events.deferred).toContainEqual({ type: 'DamageDealt', amount: 10 });
  });

  it('uses the max freeze duration when multiple hits apply freeze', () => {
    const state = {
      ...createInitialEngineState(),
      enemies: [
        {
          id: 'enemy-1',
          type: 'Drone',
          pathIndex: 0,
          progress: 0,
          hp: 100,
          shield: 0,
          reward: 10,
          frozen: 0,
        },
      ],
      projectiles: [
        {
          id: 'projectile-1',
          origin: [0, 2, 0] as [number, number, number],
          targetId: 'enemy-1',
          speed: 20,
          progress: 0.99,
          damage: 1,
          color: '#fff',
          freezeDuration: 1,
        },
        {
          id: 'projectile-2',
          origin: [0, 2, 0] as [number, number, number],
          targetId: 'enemy-1',
          speed: 20,
          progress: 0.99,
          damage: 1,
          color: '#fff',
          freezeDuration: 2,
        },
      ],
    };

    const result = stepProjectiles(
      state,
      path,
      { deltaMs: 100, nowMs: 2000, rng: () => 0.5 },
      { tileSize: 2 },
    );

    expect(result.patch.enemies).toHaveLength(1);
    expect(result.patch.enemies?.[0]?.frozen).toBe(2);
  });
});
