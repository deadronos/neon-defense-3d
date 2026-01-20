import React from 'react';

import type { ProjectileEntity } from '../../types';
import { lerp } from '../../utils/math';

import { TEMP_COLOR } from './instancing/instancedUtils';
import { useInstancedUpdater } from './instancing/useInstancedUpdater';

export const InstancedProjectiles: React.FC = () => {
  const { setMeshRef } = useInstancedUpdater<ProjectileEntity>((state) => state.projectiles, {
    count: 2000,
    meshKeys: ['main'],
    updateInstance: (i, proj, dummy, meshes, { alpha, renderState }) => {
      if (meshes.main == null) return;

      const prev = renderState.previousProjectilePositions.get(proj.id) ?? proj.position;
      const px = lerp(prev[0], proj.position[0], alpha);
      const py = lerp(prev[1], proj.position[1], alpha);
      const pz = lerp(prev[2], proj.position[2], alpha);

      dummy.position.set(px, py, pz);
      dummy.scale.set(0.3, 0.3, 0.3);
      dummy.updateMatrix();
      meshes.main.setMatrixAt(i, dummy.matrix);

      const color = proj.color || '#ff00ff';
      TEMP_COLOR.set(color).multiplyScalar(3.0);
      meshes.main.setColorAt(i, TEMP_COLOR);
    },
  });

  return (
    <instancedMesh
      ref={setMeshRef('main')}
      args={[undefined, undefined, 2000]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[0.5, 0]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
};
