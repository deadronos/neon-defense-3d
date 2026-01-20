import { TileType } from '../../types';

/**
 * Adjacency definitions for Wave Function Collapse.
 * Defines which tiles can be neighbors in specific directions.
 * Directions: [Top, Right, Bottom, Left]
 */

export const ADJACENCY = {
  [TileType.Grass]: {
    top: [TileType.Grass, TileType.Path, TileType.Spawn, TileType.Base],
    right: [TileType.Grass, TileType.Path, TileType.Spawn, TileType.Base],
    bottom: [TileType.Grass, TileType.Path, TileType.Spawn, TileType.Base],
    left: [TileType.Grass, TileType.Path, TileType.Spawn, TileType.Base],
  },
  [TileType.Path]: {
    // Paths generally connect to other paths, spawns, or bases.
    // We want to avoid paths dead-ending into grass, but strictly solving this
    // with local rules is hard. We rely on the "Verify Global Path" step for that.
    // However, to make it look "neat", we can say:
    top: [TileType.Grass, TileType.Path, TileType.Spawn, TileType.Base],
    right: [TileType.Grass, TileType.Path, TileType.Spawn, TileType.Base],
    bottom: [TileType.Grass, TileType.Path, TileType.Spawn, TileType.Base],
    left: [TileType.Grass, TileType.Path, TileType.Spawn, TileType.Base],
  },
  [TileType.Spawn]: {
    // Spawns must connect to a path.
    // In our simplified WFC, we might just treat them as "Path-like" but unique.
    top: [TileType.Grass, TileType.Path],
    right: [TileType.Grass, TileType.Path],
    bottom: [TileType.Grass, TileType.Path],
    left: [TileType.Grass, TileType.Path],
  },
  [TileType.Base]: {
    // Bases must connect to a path.
    top: [TileType.Grass, TileType.Path],
    right: [TileType.Grass, TileType.Path],
    bottom: [TileType.Grass, TileType.Path],
    left: [TileType.Grass, TileType.Path],
  },
};

/**
 * For a sharper implementation, we define sockets.
 * 0: Grass edge
 * 1: Path edge
 *
 * Tile Sockets (Top, Right, Bottom, Left):
 * Grass: [0, 0, 0, 0]
 * Path_Horizontal: [0, 1, 0, 1]
 * Path_Vertical: [1, 0, 1, 0]
 * Path_Corner_TR: [1, 1, 0, 0] (Top, Right connected)
 * ... etc.
 *
 * Current Game uses a simplified "TileType" where visual connectivity is handled by the renderer (or just simple blocks).
 * If we want to generate a *valid 2D Array* of simple types (0,1,2,3), we treat them as atoms.
 *
 * Constraint:
 * A Path tile prefers to have at least 2 Path neighbors.
 * Spawn has exactly 1 Path neighbor.
 * Base has exactly 1 Path neighbor.
 *
 * Since standard WFC is strict, we'll use a "weighted random walker" or specific WFC tileset
 * if we want perfect mazes.
 *
 * However, for "The Neural Network", a simple Randomized Prim's or Recursive Backtracker
 * might be more reliable for generating *TD mazes* than pure WFC.
 *
 * Let's stick to the Plan: WFC (or similar logic) to generate the array.
 * Given we only have 4 types, strict WFC might be overkill vs a 'Growth' algorithm.
 * but we will implement the structures for a potential WFC or hybrid.
 */
