import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';

import type { EnemyEntity } from '../../types';

import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';
import { ParticlePool } from './instancing/ParticlePool';

export const InstancedTrails: React.FC<{ enemies: EnemyEntity[] }> = ({ enemies }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 10000; // High capacity for trails
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);

  // Particle system pool
  const [pool] = useState(() => new ParticlePool(count));

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // 1. Spawn new particles
    // Iterate enemies and spawn a trail particle at their current position
    for (const enemy of enemies) {
      colorHelper.set(enemy.config.color);

      // Add small random offset for volume/jitter
      const ox = (Math.random() - 0.5) * 0.2;
      const oy = (Math.random() - 0.5) * 0.2;
      const oz = (Math.random() - 0.5) * 0.2;

      pool.activateParticle(
        enemy.position.x + ox,
        enemy.position.y + 0.5 + oy, // Center vertically roughly
        enemy.position.z + oz,
        0,
        0,
        0, // Static particles (footprints)
        colorHelper.r,
        colorHelper.g,
        colorHelper.b,
        0.25, // Base scale
        0.5, // Lifetime in seconds
        enemy.id,
      );
    }

    // 2. Update active particles
    for (let i = 0; i < count; i++) {
      if (pool.active[i]) {
        pool.life[i] -= delta;

        if (pool.life[i] <= 0) {
          pool.active[i] = 0;
          meshRef.current.setMatrixAt(i, ZERO_MATRIX);
        } else {
          // Update visualization
          dummy.position.set(
            pool.position[i * 3],
            pool.position[i * 3 + 1],
            pool.position[i * 3 + 2],
          );

          // Fade out scale
          const lifeRatio = pool.life[i] / pool.maxLife[i];
          const s = pool.scale[i] * lifeRatio;

          dummy.scale.set(s, s, s);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);

          // Set color
          TEMP_COLOR.setRGB(pool.color[i * 3], pool.color[i * 3 + 1], pool.color[i * 3 + 2]);
          meshRef.current.setColorAt(i, TEMP_COLOR);
        }
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0.4} toneMapped={false} />
    </instancedMesh>
  );
};
