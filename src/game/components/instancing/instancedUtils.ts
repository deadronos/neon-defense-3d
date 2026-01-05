import * as THREE from 'three';

// Optimization: Shared temporary objects to avoid garbage collection in high-frequency render loops
export const ZERO_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);
export const TEMP_COLOR = new THREE.Color();

function ensureVertexColors(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position');
  if (!position) return;

  const existing = geometry.getAttribute('color');
  if (existing?.count === position.count) return;

  const colors = new Float32Array(position.count * 3);
  colors.fill(1);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export function ensureInstanceColor(mesh: THREE.InstancedMesh, count: number) {
  if (mesh.instanceColor?.count !== count) {
    const attribute = new THREE.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3);
    attribute.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = attribute;
  }
  if (mesh.geometry) {
    // Three only enables vertex-color codepaths (USE_COLOR) when a 'color' attribute exists.
    // Instanced colors piggyback on the same shader varying, so we must ensure vertex colors exist.
    ensureVertexColors(mesh.geometry);

    if (mesh.instanceColor) {
      mesh.geometry.setAttribute('instanceColor', mesh.instanceColor);
    }
  }
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

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
