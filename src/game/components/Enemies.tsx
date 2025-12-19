import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

import type { EnemyEntity } from '../../types';

import { hideUnusedInstances, TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';

export const InstancedEnemies: React.FC<{ enemies: EnemyEntity[] }> = ({ enemies }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const shieldRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.InstancedMesh>(null); // Rotating ring
  const count = 1000;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!meshRef.current || !shieldRef.current || !ringRef.current) return;
    const time = clock.getElapsedTime();

    enemies.forEach((enemy, i) => {
      if (i >= count) return;

      const scale = enemy.config.scale || 0.4;

      // Update Body
      dummy.position.copy(enemy.position);
      dummy.position.y += scale + 0.1;
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);

      // Color logic
      const isDashing = enemy.abilityActiveTimer > 0;
      const baseColor = isDashing ? '#ffffff' : enemy.config.color;
      // High intensity color for neon look
      // Optimization: Reuse shared TEMP_COLOR to avoid GC overhead
      TEMP_COLOR.set(baseColor).multiplyScalar(2);
      meshRef.current?.setColorAt(i, TEMP_COLOR);

      // Update Shield
      if (enemy.shield > 0) {
        dummy.scale.set(scale * 1.5, scale * 1.5, scale * 1.5);
        dummy.rotation.set(0, 0, 0); // Reset rotation for shield sphere
        dummy.updateMatrix();
        shieldRef.current?.setMatrixAt(i, dummy.matrix);
        TEMP_COLOR.set('#00ffff');
        shieldRef.current?.setColorAt(i, TEMP_COLOR);
      } else {
        shieldRef.current?.setMatrixAt(i, ZERO_MATRIX);
      }

      // Rotating Ring
      dummy.scale.set(scale * 2.0, scale * 2.0, scale * 2.0);
      dummy.rotation.set(time * 2, time, 0);
      dummy.updateMatrix();
      ringRef.current?.setMatrixAt(i, dummy.matrix);
      // Ring color logic - maybe darker than body?
      TEMP_COLOR.set(enemy.config.color).multiplyScalar(0.5);
      ringRef.current?.setColorAt(i, TEMP_COLOR);
    });

    // Hide unused
    if (meshRef.current) hideUnusedInstances(meshRef.current, enemies.length, count);
    if (shieldRef.current) hideUnusedInstances(shieldRef.current, enemies.length, count);
    if (ringRef.current) hideUnusedInstances(ringRef.current, enemies.length, count);

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    shieldRef.current.instanceMatrix.needsUpdate = true;
    if (shieldRef.current.instanceColor) shieldRef.current.instanceColor.needsUpdate = true;

    ringRef.current.instanceMatrix.needsUpdate = true;
    if (ringRef.current.instanceColor) ringRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={shieldRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="white"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      {/* Rotating Ring */}
      <instancedMesh ref={ringRef} args={[undefined, undefined, count]}>
        <torusGeometry args={[0.7, 0.05, 8, 32]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
};
