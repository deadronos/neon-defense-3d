import React from 'react';

import type { ProjectileEntity } from '../../types';
import { useInstancedEntities } from '../hooks/useInstancedEntities';

import { TEMP_COLOR } from './instancing/instancedUtils';

export const InstancedProjectiles: React.FC<{
  projectiles: ProjectileEntity[];
}> = ({ projectiles }) => {
  const meshRef = useInstancedEntities({
    entities: projectiles,
    count: 2000,
    updateEntity: (proj, dummy, i, mesh) => {
      dummy.position.set(proj.position[0], proj.position[1], proj.position[2]);

      dummy.scale.set(0.3, 0.3, 0.3);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Use projectile color
      const color = proj.color || '#ff00ff';
      // Increase intensity for bloom
      TEMP_COLOR.set(color).multiplyScalar(10);
      mesh.setColorAt(i, TEMP_COLOR);
    },
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 2000]} frustumCulled={false}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial toneMapped={false} emissive="white" emissiveIntensity={2} />
    </instancedMesh>
  );
};
