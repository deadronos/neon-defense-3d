import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRenderState } from '../../gameContexts';
import { ensureInstanceColor } from './instancedUtils';

export interface InstancedUpdaterOptions<T> {
  count: number;
  setupGeometry?: () => THREE.BufferGeometry | null;
  updateInstance: (
    index: number,
    entity: T,
    dummy: THREE.Object3D,
    matrices: Record<string, THREE.InstancedMesh>,
    context: {
      time: number;
      alpha: number;
      renderState: any; // Using any here to avoid circular dependencies with RenderState type
    }
  ) => void;
  meshKeys: string[];
}

export const useInstancedUpdater = <T>(
  entitiesSelector: (state: any) => T[],
  options: InstancedUpdaterOptions<T>
) => {
  const { count, updateInstance, meshKeys } = options;
  const renderStateRef = useRenderState();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const meshRefs = useRef<Record<string, THREE.InstancedMesh | null>>({});

  // Initialize refs
  if (Object.keys(meshRefs.current).length === 0) {
    meshKeys.forEach((key) => {
      meshRefs.current[key] = null;
    });
  }

  // Helper to set ref
  const setMeshRef = (key: string) => (mesh: THREE.InstancedMesh | null) => {
    meshRefs.current[key] = mesh;
  };

  useFrame(({ clock }) => {
    const renderState = renderStateRef.current;
    const entities = entitiesSelector(renderState);
    const time = clock.getElapsedTime();
    const alpha = renderState.renderAlpha || 0;

    const renderCount = Math.min(entities.length, count);

    // Prepare meshes
    meshKeys.forEach((key) => {
      const mesh = meshRefs.current[key];
      if (mesh) {
        ensureInstanceColor(mesh, count);
        mesh.count = renderCount;
      }
    });

    // Update loop
    for (let i = 0; i < renderCount; i++) {
      const entity = entities[i];
      // We pass the map of meshes (filtered for nulls? No, logic inside updateInstance should handle it or we cast)
      // Actually, cleaner to pass the map of refs or values.
      // Let's pass the map where keys are strings and values are the meshes.
      // But typescript needs to know they are InstancedMesh.

      const activeMeshes: Record<string, THREE.InstancedMesh> = {};
      let hasMesh = false;
      for (const key of meshKeys) {
        if (meshRefs.current[key]) {
            activeMeshes[key] = meshRefs.current[key]!;
            hasMesh = true;
        }
      }

      if (hasMesh) {
          updateInstance(i, entity, dummy, activeMeshes, { time, alpha, renderState });
      }
    }

    // Flag updates
    meshKeys.forEach((key) => {
      const mesh = meshRefs.current[key];
      if (mesh) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    });
  });

  return { setMeshRef, dummy };
};
