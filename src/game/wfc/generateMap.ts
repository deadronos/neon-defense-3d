import { generatePath } from '../../constants';
import { TileType } from '../../types';

import { createRNG } from './rng';

interface Waypoint {
  x: number;
  y: number;
}

const createEmptyMap = (width: number, height: number) =>
  Array.from({ length: height }, () => Array<number>(width).fill(TileType.Grass));

const pickEdgeRow = (height: number, rng: ReturnType<typeof createRNG>) =>
  height > 2 ? Math.floor(rng.next() * (height - 2)) + 1 : 0;

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

const hasPathClump = (map: number[][]) =>
  map.some((row, y) =>
    row.some(
      (tile, x) =>
        tile !== TileType.Grass &&
        x + 1 < row.length &&
        y + 1 < map.length &&
        row[x + 1] !== TileType.Grass &&
        map[y + 1][x] !== TileType.Grass &&
        map[y + 1][x + 1] !== TileType.Grass,
    ),
  );

export const generateProceduralMap = (seed: string, width: number, height: number): number[][] => {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height < 2
  ) {
    throw new RangeError('Map dimensions must fit distinct spawn and base tiles.');
  }
  const minimumPathLength = Math.min(18, width + height - 1);
  for (let attempt = 0; attempt < 16; attempt++) {
    const map = generateMapWFC(`${seed}:${attempt}`, width, height);
    if (!hasPathClump(map) && generatePath(map).length >= minimumPathLength) return map;
  }

  // A corner-to-corner L has width + height - 1 tiles and no shortcuts.
  const map = createEmptyMap(width, height);
  const start = { x: 0, y: 0 };
  const end = { x: width - 1, y: height - 1 };
  map[start.y][start.x] = TileType.Spawn;
  carveManhattanPath(map, start, end, createRNG(seed).next() > 0.5);
  map[end.y][end.x] = TileType.Base;
  return map;
};
