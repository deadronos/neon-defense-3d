import * as THREE from 'three';

export const createGridGeometry = (
  width: number,
  height: number,
  tileSize: number,
): THREE.BufferGeometry => {
  const positions: number[] = [];

  // Tiles are centered at (x * tileSize, z * tileSize) within the World's group.
  // Grid lines should sit on tile boundaries, so we offset by half a tile.
  const startX = -tileSize / 2;
  const startZ = -tileSize / 2;
  const endX = width * tileSize - tileSize / 2;
  const endZ = height * tileSize - tileSize / 2;

  for (let x = 0; x <= width; x += 1) {
    const px = startX + x * tileSize;
    positions.push(px, 0, startZ, px, 0, endZ);
  }

  for (let z = 0; z <= height; z += 1) {
    const pz = startZ + z * tileSize;
    positions.push(startX, 0, pz, endX, 0, pz);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
};
