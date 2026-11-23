import { useFrame } from '@react-three/fiber';
import { useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three';

import { useRenderState } from '../../gameContexts';
import type { RenderState } from '../../renderStateUtils';

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
      cameraQuaternion: THREE.Quaternion;
      renderState: RenderState;
    },
  ) => void;
  meshKeys: string[];
  compactKeys?: readonly string[];
}

export const useInstancedUpdater = <T>(
  entitiesSelector: (state: RenderState) => T[],
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

  const context = useMemo(
    () => ({
      time: 0,
      alpha: 0,
      cameraQuaternion: new THREE.Quaternion(),
      renderState: renderStateRef.current,
    }),
    [renderStateRef],
  );

  useFrame(({ clock, camera }) => {
    const renderState = renderStateRef.current;
    const entities = entitiesSelector(renderState);
    const time = clock.getElapsedTime();
    const alpha = renderState.renderAlpha || 0;

    const renderCount = Math.min(entities.length, count);

    const activeMeshes = meshRefs.current;
    context.time = time;
    context.alpha = alpha;
    context.renderState = renderState;
    context.cameraQuaternion.copy(camera.quaternion);
    for (const key of meshKeys) {
      const mesh = activeMeshes[key];
      if (mesh) mesh.count = options.compactKeys?.includes(key) ? 0 : renderCount;
    }

    if (renderCount === 0) return;

    for (let i = 0; i < renderCount; i++) {
      updateInstance(i, entities[i], dummy, activeMeshes, context);
    }

    for (const key of meshKeys) {
      const mesh = activeMeshes[key];
      if (mesh && mesh.count > 0) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
  });

  return { setMeshRef, dummy };
};
