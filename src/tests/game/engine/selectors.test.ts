import { describe, expect, it } from 'vitest';

import {
  selectEnemyWorldPosition,
  selectProjectileWorldPosition,
} from '../../../game/engine/selectors';

describe('engine selectors', () => {
  it('selectEnemyWorldPosition falls back to [0,0] when pathIndex is out of range', () => {
    const enemy = {
      id: 'e1',
      type: 'Drone',
      pathIndex: 999,
      progress: 0.5,
      hp: 10,
    };

    const pos = selectEnemyWorldPosition(enemy, [], 2);
    expect(pos).toEqual([0, 1, 0]);
  });

  it('selectEnemyWorldPosition falls back to p1 when p2 is missing', () => {
    const enemy = {
      id: 'e1',
      type: 'Drone',
      pathIndex: 0,
      progress: 0.75,
      hp: 10,
    };

    const pos = selectEnemyWorldPosition(enemy, [[3, 4]], 2);
    // With only one waypoint, p2 = p1, so interpolation stays at p1.
    expect(pos).toEqual([3 * 2, 1, 4 * 2]);
  });

  it('selectProjectileWorldPosition returns origin when target is missing', () => {
    const projectile = {
      id: 'p1',
      origin: [10, 2, -5] as const,
      targetId: 'e1',
      speed: 1,
      progress: 0.5,
      damage: 1,
      color: '#fff',
    };

    const pos = selectProjectileWorldPosition(projectile, undefined, [[0, 0]], 2);
    expect(pos).toEqual(projectile.origin);
  });

  it('selectProjectileWorldPosition lerps toward the target world position', () => {
    const projectile = {
      id: 'p1',
      origin: [0, 0, 0] as const,
      targetId: 'e1',
      speed: 1,
      progress: 0.5,
      damage: 1,
      color: '#fff',
    };

    const target = {
      id: 'e1',
      type: 'Drone',
      pathIndex: 0,
      progress: 0,
      hp: 10,
    };

    // Target at waypoint [2,3] => world [4,1,6] with tileSize=2
    const pos = selectProjectileWorldPosition(projectile, target, [[2, 3]], 2);
    expect(pos).toEqual([2, 0.5, 3]);
  });
});
