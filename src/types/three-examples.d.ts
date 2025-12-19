declare module 'three/examples/jsm/utils/BufferGeometryUtils' {
  import type { BufferGeometry } from 'three';

  export function mergeBufferGeometries(
    geometries: BufferGeometry[],
    useGroups?: boolean,
  ): BufferGeometry | null;
}
