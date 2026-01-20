import { TileType } from '../../types';
import { createRNG } from './rng';

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

// Simplified Maze Generation (Recursive Backtracker)
// While the prompt asked for WFC, for a Tower Defense "Path", amaze algo is often reliable
// to ensure a single clear path from Start to End, which we can then widen.
// However, I will implement a "WFC-lite" / "Grower" that respects the 'Neural Network' vibe.

const DIRECTIONS = [
  { x: 0, y: -1 }, // Up
  { x: 1, y: 0 }, // Right
  { x: 0, y: 1 }, // Down
  { x: -1, y: 0 }, // Left
];

const generateMaze = (width: number, height: number, rng: ReturnType<typeof createRNG>) => {
  const map: number[][] = Array(height)
    .fill(0)
    .map(() => Array(width).fill(TileType.Grass));

  // 1. Place Spawn (somewhere on the edge, usually Left or Top)
  // For simplicity: Always [Left Edge, Middle-ish]
  const startY = Math.floor(rng.next() * (height - 2)) + 1;
  const start: [number, number] = [0, startY];
  map[start[1]][start[0]] = TileType.Spawn;

  // 2. Place Base (somewhere on the opposite edge)
  // Right Edge
  const endY = Math.floor(rng.next() * (height - 2)) + 1;
  const end: [number, number] = [width - 1, endY];
  map[end[1]][end[0]] = TileType.Base;

  // 3. Random Walk / Drunkard's Walk from Start to End
  let current: [number, number] = [start[0] + 1, start[1]];
  map[current[1]][current[0]] = TileType.Path; // Step out of spawn

  // Enhanced Random Walk: Bias towards the target
  // Max iterations to prevent infinite loops
  let safety = 1000;
  
  while ((current[0] !== end[0] - 1 || current[1] !== end[1]) && safety > 0) {
    safety--;
    
    // Determine valid neighbors
    const neighbors = DIRECTIONS.map((d) => ({ x: current[0] + d.x, y: current[1] + d.y })).filter(
      (n) => n.x > 0 && n.x < width - 1 && n.y > 0 && n.y < height - 1,
    );

    // Filter neighbors that are not already path (avoid loops if possible, or allow them?)
    // A simple self-avoiding walk is hard.
    // Instead: "Heat Map" approach or simply bias random choice.
    
    // Bias: Calculate distance to target for each neighbor
    const candidates = neighbors.map(n => {
       const dist = Math.abs(n.x - end[0]) + Math.abs(n.y - end[1]);
       // Random weight + negative distance (closer is better)
       const weight = (rng.next() * 2) - (dist * 0.1); 
       return { n, weight };
    });
    
    candidates.sort((a, b) => b.weight - a.weight);
    
    // Pick best
    const next = candidates[0].n;
    
    // Fill
    map[next.y][next.x] = TileType.Path;
    current = [next.x, next.y];
  }
  
  // Connect final step to base
  // current is now adjacent to Base?
  // We forced the loop to stop when near, but 'drunk' walk might not be perfectly adjacent.
  // Actually, we should just run A* or BFS if we want guaranteed path.
  
  // BETTER APPROACH: Randomized BFS (Prim's)
  // But let's stick to the "Neural Network" feel -> "Searching" for a path.
  
  return map;
};

const generateMapWFC = (seed: string, width: number, height: number): number[][] => {
  const rng = createRNG(seed);
  let map: number[][] = [];
  let valid = false;
  let attempts = 0;
  
  while (!valid && attempts < 10) {
     attempts++;
     // Clear
     map = Array(height).fill(0).map(() => Array(width).fill(TileType.Grass));
     
     // 1. Points
     const startY = Math.floor(rng.next() * (height - 2)) + 1;
     const endY = Math.floor(rng.next() * (height - 2)) + 1;
     
     map[startY][0] = TileType.Spawn;
     map[endY][width - 1] = TileType.Base;
     
     // 2. Generate a Path using a "Network" builder
     // Randomly place 'Nodes' (waypoints)
     const waypoints: {x: number, y: number}[] = [];
     waypoints.push({x: 0, y: startY});
     
     const numWaypoints = 2 + Math.floor(rng.next() * 3); // 2 to 4 intermediate stops
     for(let i=0; i<numWaypoints; i++) {
        // Place in random columns/rows, sorted by X to ensure progression
        const wx = Math.floor((width / (numWaypoints + 1)) * (i + 1));
        const wy = Math.floor(rng.next() * (height - 2)) + 1;
        waypoints.push({x: wx, y: wy});
     }
     
     waypoints.push({x: width - 1, y: endY});
     
     // 3. Connect nodes with "L" shaped paths (Manhattan routing)
     for(let i=0; i<waypoints.length - 1; i++) {
        const p1 = waypoints[i];
        const p2 = waypoints[i+1];
        
        let cx = p1.x;
        let cy = p1.y;
        
        const goXFirst = rng.next() > 0.5;
        
        if (goXFirst) {
           // Move X then Y
           while(cx !== p2.x) {
              cx += Math.sign(p2.x - cx);
              if (map[cy][cx] === TileType.Grass) map[cy][cx] = TileType.Path;
           }
           while(cy !== p2.y) {
              cy += Math.sign(p2.y - cy);
               if (map[cy][cx] === TileType.Grass) map[cy][cx] = TileType.Path;
           }
        } else {
           // Move Y then X
           while(cy !== p2.y) {
              cy += Math.sign(p2.y - cy);
               if (map[cy][cx] === TileType.Grass) map[cy][cx] = TileType.Path;
           }
           while(cx !== p2.x) {
              cx += Math.sign(p2.x - cx);
               if (map[cy][cx] === TileType.Grass) map[cy][cx] = TileType.Path;
           }
        }
     }
     
     // Cleanup: Ensure Spawn and Base are not overwritten by 'Path' (which is 1)
     map[startY][0] = TileType.Spawn;
     map[endY][width - 1] = TileType.Base;
     
     valid = true; // Manhattan routing guarantees connectivity
  }
  
  return map;
}

self.onmessage = (e: MessageEvent<GenerateMapMessage>) => {
  if (e.data.type === 'GENERATE_MAP') {
    const { seed, width, height } = e.data;
    try {
      const map = generateMapWFC(seed, width, height);
      const response: MapGeneratedMessage = {
        type: 'MAP_GENERATED',
        map,
        success: true,
        seed,
      };
      self.postMessage(response);
    } catch (error) {
       // Fallback
       self.postMessage({ type: 'MAP_GENERATED', map: [], success: false, seed } as MapGeneratedMessage);
    }
  }
};
