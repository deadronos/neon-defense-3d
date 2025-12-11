import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

import type { EnemyEntity } from '../../types';

export const InstancedEnemies: React.FC<{ enemies: EnemyEntity[] }> = ({ enemies }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const shieldRef = useRef<THREE.InstancedMesh>(null);
  const count = 1000;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current || !shieldRef.current) return;

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
      const color = new THREE.Color(baseColor).multiplyScalar(2);
      meshRef.current?.setColorAt(i, color);

      // Update Shield
      if (enemy.shield > 0) {
        dummy.scale.set(scale * 1.5, scale * 1.5, scale * 1.5);
        dummy.updateMatrix();
        shieldRef.current?.setMatrixAt(i, dummy.matrix);
        shieldRef.current?.setColorAt(i, new THREE.Color('#00ffff'));
      } else {
        shieldRef.current?.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      }
    });

    // Hide unused
    for (let i = enemies.length; i < count; i++) {
      meshRef.current?.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      shieldRef.current?.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    shieldRef.current.instanceMatrix.needsUpdate = true;
    if (shieldRef.current.instanceColor) shieldRef.current.instanceColor.needsUpdate = true;
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
    </group>
  );
};
