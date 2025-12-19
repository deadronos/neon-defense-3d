import React from 'react';
import * as THREE from 'three';

import type { ProjectileEntity, EnemyEntity } from '../../types';
import { useInstancedEntities } from '../hooks/useInstancedEntities';

import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';

export const InstancedProjectiles: React.FC<{
    projectiles: ProjectileEntity[];
    enemies: EnemyEntity[];
}> = ({
  projectiles,
  enemies
}) => {
  const meshRef = useInstancedEntities({
    entities: projectiles,
    count: 2000,
    updateEntity: (proj, dummy, i, mesh) => {
        if (!proj.active) {
            mesh.setMatrixAt(i, ZERO_MATRIX);
            return;
        }

        dummy.position.copy(proj.position);

        // Look at target if possible
        if (proj.targetId) {
            const target = enemies.find(e => e.id === proj.targetId);
            if (target) {
                dummy.lookAt(target.position);
            }
        }

        dummy.scale.set(0.3, 0.3, 0.3);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        // Use projectile color
        const color = proj.color || '#ff00ff';
        TEMP_COLOR.set(color).multiplyScalar(5);
        mesh.setColorAt(i, TEMP_COLOR);
    },
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 2000]}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};
