import { useFrame } from '@react-three/fiber';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { useRenderState } from '../GameState';

import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';
import { ParticlePool } from './instancing/ParticlePool';

export const InstancedTrails: React.FC = () => {
  const renderStateRef = useRenderState();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 10000;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);

  const lastSpawnByEnemyIdRef = useRef<Map<string, number>>(new Map());
  const activeEnemyIdsRef = useRef<Set<string>>(new Set());
  const lastPruneTimeRef = useRef(0);
  const spawnIntervalSeconds = 0.05;

  const [pool] = useState(() => new ParticlePool(count));

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
    const activeEnemyIds = activeEnemyIdsRef.current;
    activeEnemyIds.clear();

    const enemies = renderStateRef.current.enemies;

    for (const enemy of enemies) {
      activeEnemyIds.add(enemy.id);
      const last = lastSpawnByEnemyId.get(enemy.id) ?? -Infinity;
      if (now - last < spawnIntervalSeconds) continue;
      lastSpawnByEnemyId.set(enemy.id, now);

      colorHelper.set(enemy.config.color);

      const ox = (Math.random() - 0.5) * 0.2;
      const oy = (Math.random() - 0.5) * 0.2;
      const oz = (Math.random() - 0.5) * 0.2;

      pool.activateParticle(
        enemy.position[0] + ox,
        enemy.position[1] + 0.5 + oy,
        enemy.position[2] + oz,
        0,
        0,
        0,
        colorHelper.r,
        colorHelper.g,
        colorHelper.b,
        0.25,
        0.5,
        enemy.id,
      );
    }

    if (now - lastPruneTimeRef.current >= 1) {
      lastPruneTimeRef.current = now;
      for (const id of lastSpawnByEnemyId.keys()) {
        if (!activeEnemyIds.has(id)) {
          lastSpawnByEnemyId.delete(id);
        }
      }
    }

    for (let listPos = 0; listPos < pool.activeListSize; ) {
      const i = pool.activeList[listPos];

      pool.life[i] -= delta;
      if (pool.life[i] <= 0) {
        pool.deactivateParticle(i);
        meshRef.current.setMatrixAt(i, ZERO_MATRIX);
        continue;
      }

      dummy.position.set(pool.position[i * 3], pool.position[i * 3 + 1], pool.position[i * 3 + 2]);

      const lifeRatio = pool.life[i] / pool.maxLife[i];
      const s = pool.scale[i] * lifeRatio;

      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

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
