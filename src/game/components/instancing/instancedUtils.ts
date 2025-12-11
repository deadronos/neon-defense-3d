import * as THREE from 'three';

/**
 * Hides unused instances in an InstancedMesh by setting their scale to zero.
 * @param mesh - The instanced mesh to update.
 * @param startIndex - The index to start hiding from.
 * @param count - The total number of instances (buffer size).
 */
export function hideUnusedInstances(mesh: THREE.InstancedMesh, startIndex: number, count: number) {
  const matrix = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = startIndex; i < count; i++) {
    mesh.setMatrixAt(i, matrix);
  }
}
