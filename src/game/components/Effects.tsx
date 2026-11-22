import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useRenderState } from '../gameContexts';

import { spawnExplosion } from './effects/spawners';
import { ensureInstanceColor, TEMP_COLOR } from './instancing/instancedUtils';
import { ParticlePool } from './instancing/ParticlePool';

export const InstancedExplosions: React.FC<{
  remove: (id: string) => void;
}> = ({ remove }) => {
  const renderStateRef = useRenderState();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 2000;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const processedRef = useRef<Set<string>>(new Set());
  const activeEffectIdsRef = useRef<Set<string>>(new Set());
  const [pool] = React.useState(() => new ParticlePool(count));

  React.useLayoutEffect(() => {
    if (!meshRef.current) return;
    ensureInstanceColor(meshRef.current, count);
    meshRef.current.count = 0;
  }, [count]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const effects = renderStateRef.current.effects;

    for (const effect of effects) {
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
    }

    const activeEffectIds = activeEffectIdsRef.current;
    activeEffectIds.clear();

    for (let listPos = 0; listPos < pool.activeListSize;) {
      const i = pool.activeList[listPos];

      pool.life[i] -= delta;

      if (pool.life[i] <= 0) {
        pool.deactivateParticle(i);
        continue;
      }

      pool.position[i * 3] += pool.velocity[i * 3] * delta;
      pool.position[i * 3 + 1] += pool.velocity[i * 3 + 1] * delta;
      pool.position[i * 3 + 2] += pool.velocity[i * 3 + 2] * delta;

      dummy.position.set(pool.position[i * 3], pool.position[i * 3 + 1], pool.position[i * 3 + 2]);

      const s = Math.max(0, pool.scale[i] * (pool.life[i] / pool.maxLife[i]));
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(listPos, dummy.matrix);
      TEMP_COLOR.setRGB(pool.color[i * 3], pool.color[i * 3 + 1], pool.color[i * 3 + 2]);
      meshRef.current.setColorAt(listPos, TEMP_COLOR);

      const effectId = pool.associatedEffectId[i];
      if (effectId) activeEffectIds.add(effectId);

      listPos++;
    }

    meshRef.current.count = pool.activeListSize;
    if (pool.activeListSize > 0) {
      const { instanceMatrix, instanceColor } = meshRef.current;
      instanceMatrix.clearUpdateRanges();
      instanceMatrix.addUpdateRange(0, pool.activeListSize * instanceMatrix.itemSize);
      instanceMatrix.needsUpdate = true;
      if (instanceColor) {
        instanceColor.clearUpdateRanges();
        instanceColor.addUpdateRange(0, pool.activeListSize * instanceColor.itemSize);
        instanceColor.needsUpdate = true;
      }
    }

    for (const e of effects) {
      if (processedRef.current.has(e.id) && !activeEffectIds.has(e.id)) {
        remove(e.id);
        processedRef.current.delete(e.id);
      }
    }
  });

  return (
    <instancedMesh ref={meshRef} frustumCulled={false} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshBasicMaterial toneMapped={false} vertexColors />
    </instancedMesh>
  );
};
