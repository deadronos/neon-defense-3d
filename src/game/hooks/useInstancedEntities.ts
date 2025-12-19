import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { hideUnusedInstances, ZERO_MATRIX } from '../components/instancing/instancedUtils';

export interface UseInstancedEntitiesOptions<T> {
  entities: T[];
  count: number;
  updateEntity: (entity: T, dummy: THREE.Object3D, index: number, mesh: THREE.InstancedMesh) => void;
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

    entities.forEach((entity, i) => {
      if (i >= count) return;
      updateEntity(entity, dummy, i, meshRef.current!);
    });

    hideUnusedInstances(meshRef.current, entities.length, count);

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return meshRef;
}
