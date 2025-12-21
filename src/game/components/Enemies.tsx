import React from 'react';
import * as THREE from 'three';

import type { EnemyEntity } from '../../types';
import { useInstancedEntities } from '../hooks/useInstancedEntities';

import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';

export const InstancedEnemies: React.FC<{ enemies: EnemyEntity[] }> = ({ enemies }) => {
  const count = 1000;

  // --- 1. Body Mesh ---
  const meshRef = useInstancedEntities({
    entities: enemies,
    count,
    updateEntity: (enemy, dummy, i, mesh) => {
      const scale = enemy.config.scale || 0.4;

      dummy.position.copy(enemy.position);
      dummy.position.y += scale + 0.1;
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Color logic
      const isDashing = enemy.abilityActiveTimer > 0;
      const isFrozen = (enemy.frozen ?? 0) > 0;

      let baseColor = enemy.config.color;
      if (isDashing) {
        baseColor = '#ffffff';
      } else if (isFrozen) {
        baseColor = '#00ffff';
      }

      TEMP_COLOR.set(baseColor).multiplyScalar(2);
      mesh.setColorAt(i, TEMP_COLOR);
    },
  });

  // --- 2. Shield Mesh ---
  const shieldRef = useInstancedEntities({
    entities: enemies,
    count,
    updateEntity: (enemy, dummy, i, mesh) => {
      if (enemy.shield > 0) {
        const scale = enemy.config.scale || 0.4;

        dummy.position.copy(enemy.position);
        dummy.position.y += scale + 0.1; // Match body height
        dummy.scale.set(scale * 1.5, scale * 1.5, scale * 1.5);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        TEMP_COLOR.set('#00ffff');
        mesh.setColorAt(i, TEMP_COLOR);
      } else {
        mesh.setMatrixAt(i, ZERO_MATRIX);
      }
    },
  });

  // --- 3. Ring Mesh (Rotating) ---
  const ringRef = useInstancedEntities({
    entities: enemies,
    count,
    updateEntity: (enemy, dummy, i, mesh) => {
      const scale = enemy.config.scale || 0.4;
      const time = Date.now() * 0.001; // Should match clock.getElapsedTime() roughly, but internal state might vary.
      // Better to use a consistent time source if possible, but useInstancedEntities doesn't pass clock.
      // We can use performance.now() or just Date.now().
      // The original code used `clock.getElapsedTime()`.
      // Let's stick to Date.now() / 1000 for simplicity as it's visual only.

      dummy.position.copy(enemy.position);
      dummy.position.y += scale + 0.1; // Match body height

      dummy.scale.set(scale * 2.0, scale * 2.0, scale * 2.0);
      dummy.rotation.set(time * 2, time, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      TEMP_COLOR.set(enemy.config.color).multiplyScalar(0.5);
      mesh.setColorAt(i, TEMP_COLOR);
    },
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={shieldRef} args={[undefined, undefined, count]} frustumCulled={false}>
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
      <instancedMesh ref={ringRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <torusGeometry args={[0.7, 0.05, 8, 32]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
};
