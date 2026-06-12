import type {
  EngineEnemy,
  EngineState,
  EngineTower,
  EngineVector2,
} from '../../../../game/engine/types';

const PATH: readonly EngineVector2[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
];

const makeEnemy = (id: string, pathIndex: number, progress: number, hp = 100): EngineEnemy => ({
  id,
  type: 'basic',
  pathIndex,
  progress,
  hp,
  speed: 1,
  reward: 5,
  color: '#ff00ff',
  scale: 0.4,
});

const makeTower = (id: string, type: string, lastFired: number): EngineTower => ({
  id,
  type,
  level: 1,
  gridPosition: [2, 0],
  lastFired,
  activeSynergies: [],
});

/** Mulberry32 PRNG for deterministic testing. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const buildScenario = (): {
  state: EngineState;
  path: readonly EngineVector2[];
  rng: () => number;
} => {
  const enemies: EngineEnemy[] = [
    makeEnemy('e1', 0, 0.0),
    makeEnemy('e2', 0, 0.25),
    makeEnemy('e3', 1, 0.0),
    makeEnemy('e4', 1, 0.5),
    makeEnemy('e5', 2, 0.0),
  ];
  const towers: EngineTower[] = [makeTower('t1', 'Basic', 0), makeTower('t2', 'Basic', 0)];
  const projectiles = [
    {
      id: 'p-init-1',
      origin: [4, 2, 0] as const,
      targetId: 'e1',
      speed: 20,
      progress: 0.5,
      damage: 10,
      color: '#ffffff',
      lastTargetPosition: [2, 1, 0] as const,
    },
    {
      id: 'p-init-2',
      origin: [4, 2, 0] as const,
      targetId: 'e3',
      speed: 20,
      progress: 0.25,
      damage: 10,
      color: '#ffffff',
      lastTargetPosition: [2, 1, 0] as const,
    },
    {
      id: 'p-init-3',
      origin: [4, 2, 0] as const,
      targetId: 'e5',
      speed: 20,
      progress: 0.1,
      damage: 10,
      color: '#ffffff',
      lastTargetPosition: [2, 1, 0] as const,
    },
  ];
  const state: EngineState = {
    enemies,
    towers,
    projectiles,
    effects: [],
    wave: null,
    idCounters: { enemy: 0, tower: 0, projectile: 0, effect: 0 },
    pendingEvents: [],
  };
  return { state, path: PATH, rng: mulberry32(0xc0ffee) };
};
