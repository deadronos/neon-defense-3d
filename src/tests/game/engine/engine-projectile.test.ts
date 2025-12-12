import { describe, expect, it } from 'vitest';

import { createInitialEngineState } from '../../../game/engine/state';
import { stepProjectiles } from '../../../game/engine/projectile';

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
    expect(result.events.deferred).toEqual([{ type: 'EnemyKilled', enemyId: 'enemy-1', reward: 11 }]);
  });
});

