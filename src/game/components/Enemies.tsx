import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useGame } from '../GameState';

import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';

export const InstancedEnemies: React.FC = () => {
  const { renderStateRef } = useGame();
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
    const time = clock.getElapsedTime(); // Use clock time for consistency

    // Determine count to render
    const activeCount = Math.min(enemies.length, count);

    // Update Counts
    if (bodyMeshRef.current) bodyMeshRef.current.count = activeCount;
    if (shieldMeshRef.current) shieldMeshRef.current.count = activeCount;
    if (ringMeshRef.current) ringMeshRef.current.count = activeCount;

    // Single Loop to update all meshes
    for (let i = 0; i < activeCount; i++) {
      const enemy = enemies[i];
      const scale = enemy.config.scale || 0.4;

      // -- Shared Transform --
      dummy.position.set(enemy.position[0], enemy.position[1], enemy.position[2]);
      dummy.rotation.set(0, 0, 0);

      // 1. Body Mesh
      if (bodyMeshRef.current) {
        // Offset Y
        dummy.position.y = enemy.position[1] + scale + 0.1;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        bodyMeshRef.current.setMatrixAt(i, dummy.matrix);

        // Color
        const isDashing = enemy.abilityActiveTimer > 0;
        const isFrozen = (enemy.frozen ?? 0) > 0;
        let baseColor = enemy.config.color;
        if (isDashing) {
          baseColor = '#ffffff';
        } else if (isFrozen) {
          baseColor = '#00ffff';
        }
        TEMP_COLOR.set(baseColor).multiplyScalar(10);
        bodyMeshRef.current.setColorAt(i, TEMP_COLOR);
      }

      // 2. Shield Mesh
      if (shieldMeshRef.current) {
        if (enemy.shield > 0) {
          // Reset dummy position from body offset
          dummy.position.set(enemy.position[0], enemy.position[1], enemy.position[2]);
          dummy.position.y += scale + 0.1;
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
        dummy.position.set(enemy.position[0], enemy.position[1], enemy.position[2]);
        dummy.position.y += scale + 0.1;
        dummy.scale.set(scale * 2.0, scale * 2.0, scale * 2.0);
        // Explicit rotation
        dummy.rotation.set(time * 2, time, 0);
        dummy.updateMatrix();
        ringMeshRef.current.setMatrixAt(i, dummy.matrix);

        TEMP_COLOR.set(enemy.config.color).multiplyScalar(0.5);
        ringMeshRef.current.setColorAt(i, TEMP_COLOR);
      }
    }

    // Flag updates
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
        <meshStandardMaterial toneMapped={false} emissive="white" emissiveIntensity={2} />
      </instancedMesh>

      <instancedMesh ref={shieldMeshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#00ffff"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          emissive="#00ffff"
          emissiveIntensity={1}
        />
      </instancedMesh>

      <instancedMesh ref={ringMeshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <torusGeometry args={[0.7, 0.05, 8, 32]} />
        <meshStandardMaterial toneMapped={false} emissive="white" emissiveIntensity={1} />
      </instancedMesh>
    </group>
  );
};
