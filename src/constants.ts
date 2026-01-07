import type { TileType, TowerConfig, Vector2 } from './types';
import { TowerType } from './types';

/**
 * Raw map definition as a 2D array of integers.
 * 0: Grass, 1: Path, 2: Spawn, 3: Base
 * Represents a 12x8 Grid.
 */
/**
 * Map definitions as 2D arrays of integers.
 * 0: Grass, 1: Path, 2: Spawn, 3: Base
 * Represents a 12x8 Grid.
 */
const MAP_1 = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0],
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const MAP_2 = [
  [2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0],
];

const MAP_3 = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
  [0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0],
  [0, 1, 0, 3, 0, 0, 1, 0, 0, 1, 0, 0],
  [0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
  [2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

export const MAP_LAYOUTS = [MAP_1, MAP_2, MAP_3];

/** The width of the map grid. */
// Assuming all maps have same dimensions
export const MAP_WIDTH = MAP_LAYOUTS[0][0].length;
/** The height of the map grid. */
export const MAP_HEIGHT = MAP_LAYOUTS[0].length;
/** The size of each tile in world units. */
export const TILE_SIZE = 2; // World units per tile

/**
 * Generates a path from the spawn point to the base using Breadth-First Search (BFS).
 *
 * @param mapLayout The 2D array map definition.
 * @returns An array of Vector2 coordinates representing the path. Returns an empty array if no path is found.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity, complexity
export const generatePath = (mapLayout: number[][]): Vector2[] => {
  let start: Vector2 | null = null;
  let end: Vector2 | null = null;

  // Find start and end points
  for (let z = 0; z < MAP_HEIGHT; z++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (mapLayout[z][x] === 2) start = [x, z];
      if (mapLayout[z][x] === 3) end = [x, z];
    }
  }

  if (!start || !end) return [];

  // Queue stores { position, path_so_far }
  const queue: { pos: Vector2; path: Vector2[] }[] = [{ pos: start, path: [start] }];
  const visited = new Set<string>();
  visited.add(`${start[0]},${start[1]}`);

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    const [cx, cz] = pos;

    // Check if reached end
    if (cx === end[0] && cz === end[1]) {
      return path;
    }

    const neighbors = [
      [cx + 1, cz],
      [cx - 1, cz],
      [cx, cz + 1],
      [cx, cz - 1],
    ];

    for (const [nx, nz] of neighbors) {
      if (nx >= 0 && nx < MAP_WIDTH && nz >= 0 && nz < MAP_HEIGHT) {
        const type = mapLayout[nz][nx];
        const key = `${nx},${nz}`;

        // Walkable tiles: Path (1) or Base (3)
        if ((type === 1 || type === 3) && !visited.has(key)) {
          visited.add(key);
          queue.push({ pos: [nx, nz], path: [...path, [nx, nz]] });
        }
      }
    }
  }

  return []; // No path found
};

/**
 * Helper to convert raw map to TileType grid.
 */
export const getMapGrid = (mapLayout: number[][]): TileType[][] =>
  mapLayout.map((row) => row.map((cell) => cell as TileType));

/**
 * INITIAL MAP DATA (For default initialization)
 */
export const INITIAL_MAP_LAYOUT = MAP_LAYOUTS[0];
export const INITIAL_MAP_GRID = getMapGrid(INITIAL_MAP_LAYOUT);
export const INITIAL_PATH = generatePath(INITIAL_MAP_LAYOUT);

/**
 * Configuration definitions for different enemy types.
 */
export const ENEMY_TYPES = {
  BASIC: {
    name: 'Drone',
    speed: 2.5,
    hpBase: 50,
    shield: 0,
    reward: 10,
    color: '#ff0055',
    scale: 0.4,
    abilities: undefined,
  },
  FAST: {
    name: 'Scout',
    speed: 4.5,
    hpBase: 30,
    shield: 10,
    reward: 15,
    color: '#fbbf24',
    scale: 0.3,
    abilities: ['dash'],
  },
  TANK: {
    name: 'Heavy',
    speed: 1.5,
    hpBase: 150,
    shield: 50,
    reward: 25,
    color: '#8b5cf6',
    scale: 0.6,
    abilities: undefined,
  },
  BOSS: {
    name: 'Titan',
    speed: 1.0,
    hpBase: 600,
    shield: 200,
    reward: 100,
    color: '#ef4444',
    scale: 0.9,
    abilities: undefined,
  },
};

/**
 * Configuration definitions for different tower types.
 * Keys are TowerType enum values.
 */
export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  [TowerType.Basic]: {
    name: 'Pulse Cannon',
    cost: 50,
    range: 5, // in world units
    damage: 20,
    cooldown: 0.8, // seconds
    color: '#ff0055',
    description: 'Balanced kinetic energy pulses.',
  },
  [TowerType.Rapid]: {
    name: 'Flux Emitter',
    cost: 120,
    range: 4,
    damage: 8,
    cooldown: 0.15,
    color: '#00f2ff',
    description: 'High-frequency particle stream.',
  },
  [TowerType.Sniper]: {
    name: 'Phase Driver',
    cost: 200,
    range: 9,
    damage: 100,
    cooldown: 2.5,
    color: '#f9f871',
    description: 'Long-range quantum destabilizer.',
  },
  [TowerType.Cryo]: {
    name: 'Cryo Projector',
    cost: 80,
    range: 4,
    damage: 5,
    cooldown: 0.5,
    color: '#00ffff',
    description: 'Freezes enemies, slowing them down.',
    freezeDuration: 2.0,
  },
  [TowerType.Missile]: {
    name: 'Missile Launcher',
    cost: 150,
    range: 7,
    damage: 40,
    cooldown: 2.0,
    color: '#ff4500',
    description: 'Deals splash damage to clustered enemies.',
    splashRadius: 3.0,
  },
};

/**
 * Color palette used in the game for various elements.
 */
export const COLORS = {
  grass: '#1a1a2e',
  path: '#16213e',
  spawn: '#0f3460',
  base: '#e94560',
  uiBg: 'rgba(22, 33, 62, 0.9)',
};
