import React from 'react';
import * as THREE from 'three';

import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';
import { useInstancedUpdater } from './instancing/useInstancedUpdater';
import { EnemyEntity } from '../../types';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const InstancedEnemies: React.FC = () => {
  const { setMeshRef } = useInstancedUpdater<EnemyEntity>(
    (state) => state.enemies,
    {
      count: 1000,
      meshKeys: ['body', 'shield', 'ring'],
      updateInstance: (i, enemy, dummy, meshes, { time, alpha, renderState }) => {
        const prev = renderState.previousEnemyPositions.get(enemy.id) ?? enemy.position;
        const px = lerp(prev[0], enemy.position[0], alpha);
        const py = lerp(prev[1], enemy.position[1], alpha);
        const pz = lerp(prev[2], enemy.position[2], alpha);
        const scale = enemy.config.scale ?? 0.4;

        // 1. Body Mesh
        if (meshes.body) {
          dummy.position.set(px, py + scale + 0.1, pz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();
          meshes.body.setMatrixAt(i, dummy.matrix);

          const isDashing = enemy.abilityActiveTimer > 0;
          const isFrozen = enemy.frozen > 0;
          let baseColor = enemy.config.color;
          if (isDashing) {
            baseColor = '#ffffff';
          } else if (isFrozen) {
            baseColor = '#00ffff';
          }
          TEMP_COLOR.set(baseColor).multiplyScalar(2.5);
          meshes.body.setColorAt(i, TEMP_COLOR);
        }

        // 2. Shield Mesh
        if (meshes.shield) {
          if (enemy.shield > 0) {
            dummy.position.set(px, py + scale + 0.1, pz);
            dummy.scale.set(scale * 1.5, scale * 1.5, scale * 1.5);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            meshes.shield.setMatrixAt(i, dummy.matrix);

            TEMP_COLOR.set('#00ffff');
            meshes.shield.setColorAt(i, TEMP_COLOR);
          } else {
            meshes.shield.setMatrixAt(i, ZERO_MATRIX);
          }
        }

        // 3. Ring Mesh
        if (meshes.ring) {
          dummy.position.set(px, py + scale + 0.1, pz);
          dummy.scale.set(scale * 2.0, scale * 2.0, scale * 2.0);
          dummy.rotation.set(time * 2, time, 0);
          dummy.updateMatrix();
          meshes.ring.setMatrixAt(i, dummy.matrix);

          TEMP_COLOR.set(enemy.config.color).multiplyScalar(0.6);
          meshes.ring.setColorAt(i, TEMP_COLOR);
        }
      }
    }
  );

  return (
    <group>
      <instancedMesh ref={setMeshRef('body')} args={[undefined, undefined, 1000]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={setMeshRef('shield')} args={[undefined, undefined, 1000]} frustumCulled={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          vertexColors
          toneMapped={false}
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      <instancedMesh ref={setMeshRef('ring')} args={[undefined, undefined, 1000]} frustumCulled={false}>
        <torusGeometry args={[0.7, 0.05, 8, 32]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
    </group>
  );
};
