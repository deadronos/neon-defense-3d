import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface UseInstancedEntitiesOptions<T> {
  entities: T[];
  count: number;
  updateEntity: (
    entity: T,
    dummy: THREE.Object3D,
    index: number,
    mesh: THREE.InstancedMesh,
  ) => void;
  meshRef?: React.RefObject<THREE.InstancedMesh>;
}

export function useInstancedEntities<T>({
  entities,
  count,
  updateEntity,
  meshRef: providedMeshRef,
}: UseInstancedEntitiesOptions<T>) {
  const localMeshRef = useRef<THREE.InstancedMesh>(null);
  const meshRef = providedMeshRef || localMeshRef;

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;

    const renderCount = Math.min(entities.length, count);
    if (meshRef.current.count !== renderCount) {
      meshRef.current.count = renderCount;
    }

    for (let i = 0; i < renderCount; i += 1) {
      updateEntity(entities[i], dummy, i, meshRef.current);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return meshRef;
}
