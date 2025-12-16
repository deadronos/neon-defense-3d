import * as THREE from 'three';

// Optimization: Shared temporary objects to avoid garbage collection in high-frequency render loops
export const ZERO_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);
export const TEMP_COLOR = new THREE.Color();

/**
 * Hides unused instances in an InstancedMesh by setting their scale to zero.
 * @param mesh - The instanced mesh to update.
 * @param startIndex - The index to start hiding from.
 * @param count - The total number of instances (buffer size).
 */
export function hideUnusedInstances(mesh: THREE.InstancedMesh, startIndex: number, count: number) {
  for (let i = startIndex; i < count; i++) {
    mesh.setMatrixAt(i, ZERO_MATRIX);
  }
}
