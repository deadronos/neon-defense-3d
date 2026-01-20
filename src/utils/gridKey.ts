export const gridKey = (x: number, z: number): string => `${x},${z}`;

export const orthogonalNeighborOffsets = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const;

export const forEachOrthogonalNeighborKey = (
  x: number,
  z: number,
  visit: (key: string) => void,
): void => {
  for (const [dx, dz] of orthogonalNeighborOffsets) {
    visit(gridKey(x + dx, z + dz));
  }
};
