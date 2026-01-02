import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useRenderState } from '../GameState';

import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const InstancedEnemies: React.FC = () => {
  const renderStateRef = useRenderState();
  const count = 1000;
  // Refs for each mesh part
  const bodyMeshRef = useRef<THREE.InstancedMesh>(null);
  const shieldMeshRef = useRef<THREE.InstancedMesh>(null);
  const ringMeshRef = useRef<THREE.InstancedMesh>(null);

  // Shared dummy for transforms
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const renderState = renderStateRef.current;
    const enemies = renderState.enemies;
    const time = clock.getElapsedTime();
    const alpha = renderState.renderAlpha;

    const activeCount = Math.min(enemies.length, count);

    if (bodyMeshRef.current) bodyMeshRef.current.count = activeCount;
    if (shieldMeshRef.current) shieldMeshRef.current.count = activeCount;
    if (ringMeshRef.current) ringMeshRef.current.count = activeCount;

    for (let i = 0; i < activeCount; i++) {
      const enemy = enemies[i];
      const prev = renderState.previousEnemyPositions.get(enemy.id) ?? enemy.position;
      const px = lerp(prev[0], enemy.position[0], alpha);
      const py = lerp(prev[1], enemy.position[1], alpha);
      const pz = lerp(prev[2], enemy.position[2], alpha);
      const scale = enemy.config.scale || 0.4;

      // 1. Body Mesh
      if (bodyMeshRef.current) {
        dummy.position.set(px, py + scale + 0.1, pz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        bodyMeshRef.current.setMatrixAt(i, dummy.matrix);

        const isDashing = enemy.abilityActiveTimer > 0;
        const isFrozen = (enemy.frozen ?? 0) > 0;
        let baseColor = enemy.config.color;
        if (isDashing) {
          baseColor = '#ffffff';
        } else if (isFrozen) {
          baseColor = '#00ffff';
        }
        TEMP_COLOR.set(baseColor).multiplyScalar(2.5);
        bodyMeshRef.current.setColorAt(i, TEMP_COLOR);
      }

      // 2. Shield Mesh
      if (shieldMeshRef.current) {
        if (enemy.shield > 0) {
          dummy.position.set(px, py + scale + 0.1, pz);
          dummy.scale.set(scale * 1.5, scale * 1.5, scale * 1.5);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          shieldMeshRef.current.setMatrixAt(i, dummy.matrix);

          TEMP_COLOR.set('#00ffff');
          shieldMeshRef.current.setColorAt(i, TEMP_COLOR);
        } else {
          shieldMeshRef.current.setMatrixAt(i, ZERO_MATRIX);
        }
      }

      // 3. Ring Mesh
      if (ringMeshRef.current) {
        dummy.position.set(px, py + scale + 0.1, pz);
        dummy.scale.set(scale * 2.0, scale * 2.0, scale * 2.0);
        dummy.rotation.set(time * 2, time, 0);
        dummy.updateMatrix();
        ringMeshRef.current.setMatrixAt(i, dummy.matrix);

        TEMP_COLOR.set(enemy.config.color).multiplyScalar(0.6);
        ringMeshRef.current.setColorAt(i, TEMP_COLOR);
      }
    }

    if (bodyMeshRef.current) {
      bodyMeshRef.current.instanceMatrix.needsUpdate = true;
      if (bodyMeshRef.current.instanceColor) bodyMeshRef.current.instanceColor.needsUpdate = true;
    }
    if (shieldMeshRef.current) {
      shieldMeshRef.current.instanceMatrix.needsUpdate = true;
      if (shieldMeshRef.current.instanceColor)
        shieldMeshRef.current.instanceColor.needsUpdate = true;
    }
    if (ringMeshRef.current) {
      ringMeshRef.current.instanceMatrix.needsUpdate = true;
      if (ringMeshRef.current.instanceColor) ringMeshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={bodyMeshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshLambertMaterial vertexColors />
      </instancedMesh>

      <instancedMesh ref={shieldMeshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      <instancedMesh ref={ringMeshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <torusGeometry args={[0.7, 0.05, 8, 32]} />
        <meshLambertMaterial vertexColors />
      </instancedMesh>
    </group>
  );
};
