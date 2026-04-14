import { describe, expect, it } from 'vitest';

import { ADJACENCY } from '../../../game/wfc/rules';
import { TileType } from '../../../types';

describe('WFC adjacency rules', () => {
  it('uses independent neighbor arrays per direction', () => {
    expect(ADJACENCY[TileType.Grass].top).not.toBe(ADJACENCY[TileType.Grass].right);
    expect(ADJACENCY[TileType.Path].left).not.toBe(ADJACENCY[TileType.Path].bottom);
    expect(ADJACENCY[TileType.Spawn].top).not.toBe(ADJACENCY[TileType.Base].top);
  });

  it('keeps spawn and base restricted to grass or path neighbors', () => {
    const expected = [TileType.Grass, TileType.Path];

    expect(ADJACENCY[TileType.Spawn].top).toEqual(expected);
    expect(ADJACENCY[TileType.Spawn].right).toEqual(expected);
    expect(ADJACENCY[TileType.Spawn].bottom).toEqual(expected);
    expect(ADJACENCY[TileType.Spawn].left).toEqual(expected);
    expect(ADJACENCY[TileType.Base].top).toEqual(expected);
    expect(ADJACENCY[TileType.Base].right).toEqual(expected);
    expect(ADJACENCY[TileType.Base].bottom).toEqual(expected);
    expect(ADJACENCY[TileType.Base].left).toEqual(expected);
  });
});
