import { useFrame } from '@react-three/fiber';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { useGameUi, useRenderState } from '../gameContexts';

import { ensureInstanceColor, TEMP_COLOR } from './instancing/instancedUtils';
import { ParticlePool } from './instancing/ParticlePool';

export const InstancedTrails: React.FC = () => {
  const { gameState, gameSpeed } = useGameUi();
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
    ensureInstanceColor(meshRef.current, count);
    meshRef.current.count = 0;
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current || gameState.gameStatus !== 'playing' || gameSpeed === 0) return;

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

    for (let listPos = 0; listPos < pool.activeListSize;) {
      const i = pool.activeList[listPos];

      pool.life[i] -= delta;
      if (pool.life[i] <= 0) {
        pool.deactivateParticle(i);
        continue;
      }

      dummy.position.set(pool.position[i * 3], pool.position[i * 3 + 1], pool.position[i * 3 + 2]);

      const lifeRatio = pool.life[i] / pool.maxLife[i];
      const s = pool.scale[i] * lifeRatio;

      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(listPos, dummy.matrix);

      TEMP_COLOR.setRGB(pool.color[i * 3], pool.color[i * 3 + 1], pool.color[i * 3 + 2]);
      meshRef.current.setColorAt(listPos, TEMP_COLOR);

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
  });

  return (
    <instancedMesh ref={meshRef} frustumCulled={false} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        transparent
        depthWrite={false}
        opacity={0.4}
        toneMapped={false}
        vertexColors
      />
    </instancedMesh>
  );
};
