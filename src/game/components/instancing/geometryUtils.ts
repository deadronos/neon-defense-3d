import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { TowerType } from '../../../types';

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

    for (const [x, z] of positions) {
      const clone = pylonGeo.clone();
      clone.translate(x, 0, z);
      parts.push(clone);
    }

    // CRITICAL: Ensure all geometries are non-indexed for safe merging
    const nonIndexedParts = parts.map((g) => (g.index ? g.toNonIndexed() : g));

    // Dispose originals
    for (const g of parts) if (g.index) g.dispose();
    pylonGeo.dispose();

    // 3. Merge
    const merged = mergeGeometries(nonIndexedParts);

    // Cleanup non-indexed parts
    for (const g of nonIndexedParts) g.dispose();

    if (!merged) {
      console.error('Merge failed, returned null/undefined');
      return new THREE.BoxGeometry(1, 0.2, 1);
    }

    return merged;
  } catch (err) {
    console.error('Failed to generate complex tower geometry:', err);
    return new THREE.BoxGeometry(1, 0.2, 1);
  }
};

export const createTurretGeometry = (type: TowerType): THREE.BufferGeometry => {
  switch (type) {
    case TowerType.Basic:
      return new THREE.CylinderGeometry(0.19, 0.33, 1.25, 8)
        .rotateX(Math.PI / 2)
        .translate(0, 0, 0.28);
    case TowerType.Rapid:
      return new THREE.TorusKnotGeometry(0.36, 0.11, 32, 6, 2, 3).scale(1, 1, 1.6);
    case TowerType.Sniper:
      return new THREE.BoxGeometry(0.23, 0.22, 1.95).translate(0, 0, 0.42);
    case TowerType.Cryo:
      return new THREE.OctahedronGeometry(0.64, 0).scale(0.8, 1, 1.4);
    case TowerType.Missile:
      return new THREE.CylinderGeometry(0.35, 0.51, 1, 6)
        .rotateX(Math.PI / 2)
        .translate(0, 0, 0.12);
  }
};
