import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

import type { EffectEntity } from '../../types';

import { spawnExplosion } from './effects/spawners';
import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';
import { ParticlePool } from './instancing/ParticlePool';

export const InstancedExplosions: React.FC<{
  effects: EffectEntity[];
  remove: (id: string) => void;
}> = ({ effects, remove }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 2000; // Max particles
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Track processed effects to avoid re-spawning
  const processedRef = useRef<Set<string>>(new Set());
  const activeEffectIdsRef = useRef<Set<string>>(new Set());

  // Particle system pool
  const [pool] = React.useState(() => new ParticlePool(count));

  // Hide all instances on mount (otherwise InstancedMesh starts as identity matrices).
  React.useLayoutEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      meshRef.current.setMatrixAt(i, ZERO_MATRIX);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // 1. Spawn new particles from new effects
    effects.forEach((effect) => {
      if (!processedRef.current.has(effect.id)) {
        processedRef.current.add(effect.id);
        spawnExplosion(
          pool,
          effect.position,
          effect.color ?? '#ff0000',
          effect.id,
          effect.duration,
          effect.scale,
        );
      }
    });

    // 2. Update and Render active particles (iterate only active indices)
    const activeEffectIds = activeEffectIdsRef.current;
    activeEffectIds.clear();

    for (let listPos = 0; listPos < pool.activeListSize; ) {
      const i = pool.activeList[listPos];

      pool.life[i] -= delta;

      if (pool.life[i] <= 0) {
        pool.deactivateParticle(i);
        meshRef.current.setMatrixAt(i, ZERO_MATRIX);
        continue;
      }

      // Physics
      pool.position[i * 3] += pool.velocity[i * 3] * delta;
      pool.position[i * 3 + 1] += pool.velocity[i * 3 + 1] * delta;
      pool.position[i * 3 + 2] += pool.velocity[i * 3 + 2] * delta;

      // Update Instance
      dummy.position.set(pool.position[i * 3], pool.position[i * 3 + 1], pool.position[i * 3 + 2]);

      // Scale down logic
      const s = Math.max(0, pool.scale[i] * (pool.life[i] / pool.maxLife[i]));
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
      // Optimization: Reuse shared TEMP_COLOR to avoid creating new THREE.Color per particle per frame
      TEMP_COLOR.setRGB(pool.color[i * 3], pool.color[i * 3 + 1], pool.color[i * 3 + 2]);
      meshRef.current.setColorAt(i, TEMP_COLOR);

      const effectId = pool.associatedEffectId[i];
      if (effectId) activeEffectIds.add(effectId);

      listPos++;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    // 3. Cleanup Effect States
    effects.forEach((e) => {
      if (processedRef.current.has(e.id) && !activeEffectIds.has(e.id)) {
        remove(e.id);
        processedRef.current.delete(e.id);
      }
    });
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};
