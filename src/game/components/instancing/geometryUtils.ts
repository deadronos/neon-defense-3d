import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export { mergeGeometries };

export const createComplexTowerBase = (): THREE.BufferGeometry => {
  try {
    // 1. Create the main platform (Cross shape)
    const shape = new THREE.Shape();
    const w = 0.4;
    const l = 0.7;

    shape.moveTo(-w, -l);
    shape.lineTo(w, -l);
    shape.lineTo(w, -w);
    shape.lineTo(l, -w);
    shape.lineTo(l, w);
    shape.lineTo(w, w);
    shape.lineTo(w, l);
    shape.lineTo(-w, l);
    shape.lineTo(-w, w);
    shape.lineTo(-l, w);
    shape.lineTo(-l, -w);
    shape.lineTo(-w, -w);
    shape.lineTo(-w, -l);

    const extrudeSettings = {
      steps: 1,
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    };

    const platformGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    platformGeo.rotateX(-Math.PI / 2);
    platformGeo.translate(0, 0.1, 0);

    // 2. Create Pylons (Cylinders at corners)
    const pylonGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.6, 8);
    pylonGeo.translate(0, 0.3, 0);

    const parts: THREE.BufferGeometry[] = [platformGeo];
    const pylonOffset = 0.55;

    const positions = [
      [pylonOffset, pylonOffset],
      [-pylonOffset, pylonOffset],
      [pylonOffset, -pylonOffset],
      [-pylonOffset, -pylonOffset],
    ];

    positions.forEach(([x, z]) => {
      const clone = pylonGeo.clone();
      clone.translate(x, 0, z);
      parts.push(clone);
    });

    // CRITICAL: Ensure all geometries are non-indexed for safe merging
    const nonIndexedParts = parts.map((g) => g.toNonIndexed());

    // Dispose originals
    parts.forEach((g) => g.dispose());
    pylonGeo.dispose();

    // 3. Merge
    const merged = mergeGeometries(nonIndexedParts);

    // Cleanup non-indexed parts
    nonIndexedParts.forEach((g) => g.dispose());

    if (!merged) {
      console.error('Merge failed, returned null/undefined');
      return new THREE.BoxGeometry(1, 0.2, 1);
    }

    return merged;
  } catch (e) {
    console.error('Failed to generate complex tower geometry:', e);
    return new THREE.BoxGeometry(1, 0.2, 1);
  }
};
