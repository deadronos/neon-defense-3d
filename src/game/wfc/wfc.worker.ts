import { TileType } from '../../types';

import { createRNG } from './rng';

interface Waypoint {
  x: number;
  y: number;
}

// Worker types
export type GenerateMapMessage = {
  type: 'GENERATE_MAP';
  seed: string;
  width: number;
  height: number;
};

export type MapGeneratedMessage = {
  type: 'MAP_GENERATED';
  map: number[][]; // Raw 2D array of TileType values
  success: boolean;
  seed: string;
};

const createEmptyMap = (width: number, height: number) =>
  Array.from({ length: height }, () => Array<number>(width).fill(TileType.Grass));

const pickEdgeRow = (height: number, rng: ReturnType<typeof createRNG>) =>
  Math.floor(rng.next() * (height - 2)) + 1;

const createWaypoints = (
  width: number,
  height: number,
  startY: number,
  endY: number,
  rng: ReturnType<typeof createRNG>,
): Waypoint[] => {
  const waypoints: Waypoint[] = [{ x: 0, y: startY }];
  const numWaypoints = 2 + Math.floor(rng.next() * 3);

  for (let index = 0; index < numWaypoints; index++) {
    const x = Math.floor((width / (numWaypoints + 1)) * (index + 1));
    const y = pickEdgeRow(height, rng);
    waypoints.push({ x, y });
  }

  waypoints.push({ x: width - 1, y: endY });
  return waypoints;
};

const markPath = (map: number[][], x: number, y: number) => {
  if (map[y][x] === TileType.Grass) {
    map[y][x] = TileType.Path;
  }
};

const carveManhattanPath = (map: number[][], from: Waypoint, to: Waypoint, goXFirst: boolean) => {
  let currentX = from.x;
  let currentY = from.y;

  const moveX = () => {
    while (currentX !== to.x) {
      currentX += Math.sign(to.x - currentX);
      markPath(map, currentX, currentY);
    }
  };

  const moveY = () => {
    while (currentY !== to.y) {
      currentY += Math.sign(to.y - currentY);
      markPath(map, currentX, currentY);
    }
  };

  if (goXFirst) {
    moveX();
    moveY();
    return;
  }

  moveY();
  moveX();
};

const generateMapWFC = (seed: string, width: number, height: number): number[][] => {
  const rng = createRNG(seed);
  const map = createEmptyMap(width, height);
  const startY = pickEdgeRow(height, rng);
  const endY = pickEdgeRow(height, rng);
  const waypoints = createWaypoints(width, height, startY, endY, rng);

  map[startY][0] = TileType.Spawn;
  map[endY][width - 1] = TileType.Base;

  for (let index = 0; index < waypoints.length - 1; index++) {
    carveManhattanPath(map, waypoints[index], waypoints[index + 1], rng.next() > 0.5);
  }

  map[startY][0] = TileType.Spawn;
  map[endY][width - 1] = TileType.Base;
  return map;
};

self.onmessage = ({ data }: MessageEvent<GenerateMapMessage>) => {
  const { seed, width, height } = data;

  try {
    const map = generateMapWFC(seed, width, height);
    const response: MapGeneratedMessage = {
      type: 'MAP_GENERATED',
      map,
      success: true,
      seed,
    };
    self.postMessage(response);
  } catch {
    self.postMessage({
      type: 'MAP_GENERATED',
      map: [],
      success: false,
      seed,
    });
  }
};
