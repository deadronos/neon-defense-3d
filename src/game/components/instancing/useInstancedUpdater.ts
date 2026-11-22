import { useFrame } from '@react-three/fiber';
import { useCallback, useRef, useMemo } from 'react';
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
    matrices: Record<string, THREE.InstancedMesh | undefined>,
    context: {
      time: number;
      alpha: number;
      // renderState may be a complex interdependent type from engine; allow any here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      renderState: any;
    },
  ) => void;
  meshKeys: string[];
}

export const useInstancedUpdater = <T>(
  // selector accepts engine render state; allow `any` here to avoid circular/import issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entitiesSelector: (state: any) => T[],
  options: InstancedUpdaterOptions<T>,
) => {
  const { count, updateInstance, meshKeys } = options;
  const renderStateRef = useRenderState();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const meshRefs = useRef<Record<string, THREE.InstancedMesh | undefined>>({});
  const callbacks = useRef<Record<string, (mesh: THREE.InstancedMesh | null) => void>>({});
  const setMeshRef = useCallback((key: string) => {
    callbacks.current[key] ??= (mesh) => {
      meshRefs.current[key] = mesh ?? undefined;
      if (!mesh) return;
      ensureInstanceColor(mesh, mesh.instanceMatrix.count);
      mesh.count = 0;
    };
    return callbacks.current[key];
  }, []);

  useFrame(({ clock }) => {
    const renderState = renderStateRef.current;
    const entities = entitiesSelector(renderState);
    const time = clock.getElapsedTime();
    const alpha = renderState.renderAlpha || 0;

    const renderCount = Math.min(entities.length, count);

    const activeMeshes = meshRefs.current;
    const context = { time, alpha, renderState };
    for (const key of meshKeys) {
      const mesh = activeMeshes[key];
      if (mesh) mesh.count = renderCount;
    }

    if (renderCount === 0) return;

    for (let i = 0; i < renderCount; i++) {
      updateInstance(i, entities[i], dummy, activeMeshes, context);
    }

    for (const key of meshKeys) {
      const mesh = activeMeshes[key];
      if (mesh) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
  });

  return { setMeshRef, dummy };
};
