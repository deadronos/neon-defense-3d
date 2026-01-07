import { describe, expect, it } from 'vitest';

import { TOWER_CONFIGS } from '../../../constants';
import { createInitialEngineState } from '../../../game/engine/state';
import { stepTowers } from '../../../game/engine/tower';
import type { EngineVector2 } from '../../../game/engine/types';
import { TowerType } from '../../../types';

/* eslint-disable max-lines-per-function */

const path: [number, number][] = [
  [0, 0],
  [1, 0],
];

describe('engine stepTowers', () => {
  const basicCooldownMs = TOWER_CONFIGS[TowerType.Basic].cooldown * 1000;
  const aoeCooldownMs =
    Math.max(TOWER_CONFIGS[TowerType.Cryo].cooldown, TOWER_CONFIGS[TowerType.Missile].cooldown) *
    1000;

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
          type: TowerType.Basic,
          level: 1,
          gridPosition: [0, 0] as [number, number],
          lastFired: 0,
        },
      ],
    };

    const result = stepTowers(
      state,
      path,
      { deltaMs: 16, nowMs: basicCooldownMs + 1, rng: () => 0.5 },
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
    expect(result.patch.towers?.[0]?.lastFired).toBe(basicCooldownMs + 1);
  });

  it('does not fire when the tower is on cooldown', () => {
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
          type: TowerType.Basic,
          level: 1,
          gridPosition: [0, 0] as [number, number],
          lastFired: 0,
        },
      ],
    };

    const result = stepTowers(
      state,
      path,
      { deltaMs: 16, nowMs: 0, rng: () => 0.5 },
      { tileSize: 2 },
    );

    expect(result.patch.projectiles).toBeUndefined();
    expect(result.patch.towers).toBeUndefined();
    expect(result.patch.idCounters).toBeUndefined();
    expect(result.events.immediate).toEqual([]);
  });

  it('targets the nearest enemy when multiple are in range', () => {
    const state = {
      ...createInitialEngineState(),
      enemies: [
        {
          id: 'enemy-close',
          type: 'Drone',
          pathIndex: 0,
          progress: 0,
          hp: 10,
          reward: 10,
          speed: 0,
        },
        {
          id: 'enemy-far',
          type: 'Drone',
          pathIndex: 0,
          progress: 0.5,
          hp: 10,
          reward: 10,
          speed: 0,
        },
      ],
      towers: [
        {
          id: 'tower-1',
          type: TowerType.Basic,
          level: 1,
          gridPosition: [0, 0] as [number, number],
          lastFired: 0,
        },
      ],
    };

    const result = stepTowers(
      state,
      path,
      { deltaMs: 16, nowMs: basicCooldownMs + 1, rng: () => 0.5 },
      { tileSize: 2 },
    );

    expect(result.patch.projectiles?.[0]?.targetId).toBe('enemy-close');
    expect(result.patch.towers?.[0]?.targetId).toBe('enemy-close');
  });

  it('adds freeze or splash metadata based on tower config', () => {
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
          type: TowerType.Cryo,
          level: 1,
          gridPosition: [0, 0] as [number, number],
          lastFired: 0,
        },
        {
          id: 'tower-2',
          type: TowerType.Missile,
          level: 1,
          gridPosition: [1, 0] as [number, number],
          lastFired: 0,
        },
      ],
    };

    const result = stepTowers(
      state,
      path,
      { deltaMs: 16, nowMs: aoeCooldownMs + 1, rng: () => 0.5 },
      { tileSize: 2 },
    );

    const projectiles = result.patch.projectiles ?? [];
    const cryo = projectiles.find((proj) => proj.id === 'projectile-1');
    const missile = projectiles.find((proj) => proj.id === 'projectile-2');

    expect(cryo?.freezeDuration).toBeGreaterThan(0);
    expect(missile?.splashRadius).toBeGreaterThan(0);
  });

  it('fires at extended range with GLOBAL_RANGE upgrade', () => {
    const longPath: EngineVector2[] = [
      [0, 0],
      [10, 0],
    ];

    // Tower at 0,0. Range 5.
    // We want enemy at ~5.2 distance.
    // Path length is 10 (with tileSize 1).
    // Progress 0.52 => x=5.2.
    // Tower world y=0.5. Enemy world y=0.
    // dx=5.2, dy=0.5. d2 = 27.04 + 0.25 = 27.29.
    // Base Range^2 = 25. No fire.
    // Upgrade 1 (+5%) => Range 5.25. Range^2 = 27.56. Fire.

    const state = {
      ...createInitialEngineState(),
      enemies: [
        {
          id: 'enemy-far',
          type: 'Drone',
          pathIndex: 0,
          progress: 0.52, // 5.2 units along the 10-unit path
          hp: 10,
          reward: 10,
          speed: 0,
        },
      ],
      towers: [
        {
          id: 'tower-1',
          type: TowerType.Basic,
          level: 1,
          gridPosition: [0, 0] as [number, number],
          lastFired: 0,
        },
      ],
    };

    // 1. Verify no fire without upgrade
    const resultNoUpgrade = stepTowers(
      state,
      longPath,
      { deltaMs: 16, nowMs: basicCooldownMs + 1, rng: () => 0.5 },
      { tileSize: 1 },
    );
    expect(resultNoUpgrade.patch.projectiles).toBeUndefined();

    // 2. Verify fire with upgrade (range + 5% per level)
    const resultWithUpgrade = stepTowers(
      state,
      longPath,
      {
        deltaMs: 16,
        nowMs: basicCooldownMs + 1,
        rng: () => 0.5,
        upgrades: { GLOBAL_RANGE: 1 },
      },
      { tileSize: 1 },
    );

    // Check if it fired
    expect(resultWithUpgrade.patch.projectiles).toHaveLength(1);
    expect(resultWithUpgrade.patch.projectiles?.[0]?.targetId).toBe('enemy-far');
  });
});
