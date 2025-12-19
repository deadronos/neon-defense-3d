import { useFrame } from '@react-three/fiber';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import type { EnemyEntity } from '../../types';

import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';
import { ParticlePool } from './instancing/ParticlePool';

export const InstancedTrails: React.FC<{ enemies: EnemyEntity[] }> = ({ enemies }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 10000; // High capacity for trails
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);

  // Throttle per-enemy trail spawning to avoid saturating the particle buffer.
  const lastSpawnByEnemyIdRef = useRef<Map<string, number>>(new Map());
  const spawnIntervalSeconds = 0.05; // 20 particles/sec per enemy max

  // Particle system pool
  const [pool] = useState(() => new ParticlePool(count));

  // Hide all instances on mount (otherwise InstancedMesh starts as identity matrices).
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      meshRef.current.setMatrixAt(i, ZERO_MATRIX);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const now = state.clock.elapsedTime;
    const lastSpawnByEnemyId = lastSpawnByEnemyIdRef.current;

    // 1. Spawn new particles
    // Iterate enemies and spawn a trail particle at their current position
    for (const enemy of enemies) {
      const last = lastSpawnByEnemyId.get(enemy.id) ?? -Infinity;
      if (now - last < spawnIntervalSeconds) continue;
      lastSpawnByEnemyId.set(enemy.id, now);

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
    // Iterate only active indices (dense list) for O(active) cost.
    // Note: when a particle dies we swap-remove it, so do not increment the list position.
    for (let listPos = 0; listPos < pool.activeListSize; ) {
      const i = pool.activeList[listPos];

      pool.life[i] -= delta;
      if (pool.life[i] <= 0) {
        pool.deactivateParticle(i);
        meshRef.current.setMatrixAt(i, ZERO_MATRIX);
        continue;
      }

      // Update visualization
      dummy.position.set(pool.position[i * 3], pool.position[i * 3 + 1], pool.position[i * 3 + 2]);

      // Fade out scale
      const lifeRatio = pool.life[i] / pool.maxLife[i];
      const s = pool.scale[i] * lifeRatio;

      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Set color
      TEMP_COLOR.setRGB(pool.color[i * 3], pool.color[i * 3 + 1], pool.color[i * 3 + 2]);
      meshRef.current.setColorAt(i, TEMP_COLOR);

      listPos++;
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
