import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

import type { EffectEntity } from '../../types';

import { spawnExplosion } from './effects/spawners';
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

  // Particle system pool
  const [pool] = React.useState(() => new ParticlePool(count));

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

    // 2. Update and Render active particles
    const activeEffectIds = new Set<string>();

    for (let i = 0; i < count; i++) {
      if (pool.active[i]) {
        pool.life[i] -= delta;

        if (pool.life[i] <= 0) {
          pool.active[i] = 0;
        } else {
          // Physics
          pool.position[i * 3] += pool.velocity[i * 3] * delta;
          pool.position[i * 3 + 1] += pool.velocity[i * 3 + 1] * delta;
          pool.position[i * 3 + 2] += pool.velocity[i * 3 + 2] * delta;

          // Update Instance
          dummy.position.set(
            pool.position[i * 3],
            pool.position[i * 3 + 1],
            pool.position[i * 3 + 2],
          );

          // Scale down logic
          const s = Math.max(0, pool.scale[i] * (pool.life[i] / pool.maxLife[i]));
          dummy.scale.set(s, s, s);
          dummy.updateMatrix();

          meshRef.current.setMatrixAt(i, dummy.matrix);
          meshRef.current.setColorAt(
            i,
            new THREE.Color(pool.color[i * 3], pool.color[i * 3 + 1], pool.color[i * 3 + 2]),
          );

          const effectId = pool.associatedEffectId[i];
          if (effectId) activeEffectIds.add(effectId);
        }
      } else {
        // Hide inactive
        meshRef.current.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      }
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
