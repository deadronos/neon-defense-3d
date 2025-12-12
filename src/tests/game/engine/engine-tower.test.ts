import { describe, expect, it } from 'vitest';

import { createInitialEngineState } from '../../../game/engine/state';
import { stepTowers } from '../../../game/engine/tower';

const path: [number, number][] = [
  [0, 0],
  [1, 0],
];

describe('engine stepTowers', () => {
  it('spawns a projectile with deterministic id counters when an enemy is in range', () => {
    const state = {
      ...createInitialEngineState(),
      enemies: [
        {
          id: 'enemy-1',
          type: 'Drone',
          pathIndex: 0,
          progress: 0,
          hp: 10,
          reward: 10,
          speed: 0,
        },
      ],
      towers: [
        {
          id: 'tower-1',
          type: 'Basic',
          level: 1,
          gridPosition: [0, 0] as [number, number],
          lastFired: 0,
        },
      ],
    };

    const result = stepTowers(
      state,
      path,
      { deltaMs: 16, nowMs: 1000, rng: () => 0.5 },
      { tileSize: 2 },
    );

    expect(result.patch.idCounters).toEqual({ projectile: 1 });
    expect(result.patch.projectiles).toHaveLength(1);
    expect(result.patch.projectiles?.[0]?.id).toBe('projectile-1');
    expect(result.patch.projectiles?.[0]?.targetId).toBe('enemy-1');
    expect(result.patch.projectiles?.[0]?.origin).toEqual([0, 2, 0]);
    expect(result.patch.projectiles?.[0]?.color).toBe('#ff0055');

    expect(result.patch.towers).toHaveLength(1);
    expect(result.patch.towers?.[0]?.targetId).toBe('enemy-1');
    expect(result.patch.towers?.[0]?.lastFired).toBe(1000);
  });
});
