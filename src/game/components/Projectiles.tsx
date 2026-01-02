import { useFrame } from '@react-three/fiber';
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useRenderState } from '../GameState';

import { ensureInstanceColor, TEMP_COLOR } from './instancing/instancedUtils';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const InstancedProjectiles: React.FC = () => {
  const renderStateRef = useRenderState();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 2000;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    if (meshRef.current) ensureInstanceColor(meshRef.current, count);
  }, [count]);

  useFrame(() => {
    if (!meshRef.current) return;
    ensureInstanceColor(meshRef.current, count);
    const renderState = renderStateRef.current;
    const projectiles = renderState.projectiles;
    const alpha = renderState.renderAlpha;

    const renderCount = Math.min(projectiles.length, count);
    if (meshRef.current.count !== renderCount) {
      meshRef.current.count = renderCount;
    }

    for (let i = 0; i < renderCount; i += 1) {
      const proj = projectiles[i];
      const prev = renderState.previousProjectilePositions.get(proj.id) ?? proj.position;
      const px = lerp(prev[0], proj.position[0], alpha);
      const py = lerp(prev[1], proj.position[1], alpha);
      const pz = lerp(prev[2], proj.position[2], alpha);

      dummy.position.set(px, py, pz);
      dummy.scale.set(0.3, 0.3, 0.3);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      const color = proj.color || '#ff00ff';
      TEMP_COLOR.set(color).multiplyScalar(3.0);
      meshRef.current.setColorAt(i, TEMP_COLOR);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
};


