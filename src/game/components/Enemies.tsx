import React from 'react';
import * as THREE from 'three';

import type { EnemyEntity } from '../../types';
import { lerp } from '../../utils/math';

import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';
import { useInstancedUpdater } from './instancing/useInstancedUpdater';

const BODY_TYPES = ['Drone', 'Scout', 'Heavy', 'Titan'] as const;
const BAR_KEYS = ['barTrack', 'barHp', 'barShield'] as const;
const BAR_COLORS = ['#10162a', '#78ff97', '#63cdff'] as const;
const ENEMY_MESH_KEYS = [...BODY_TYPES, ...BAR_KEYS, 'shield', 'ring'];
const COMPACT_KEYS = [...BODY_TYPES, ...BAR_KEYS];

const EnemyGeometry = ({ type }: { type: (typeof BODY_TYPES)[number] }) => {
  switch (type) {
    case 'Scout':
      return <coneGeometry args={[0.55, 1.85, 4]} />;
    case 'Heavy':
      return <boxGeometry args={[1.6, 1.35, 1.5]} />;
    case 'Titan':
      return <icosahedronGeometry args={[1.15, 0]} />;
    case 'Drone':
      return <dodecahedronGeometry args={[1, 0]} />;
  }
};

const writeHealthBars = (
  enemy: EnemyEntity,
  dummy: THREE.Object3D,
  meshes: Record<string, THREE.InstancedMesh | undefined>,
  cameraQuaternion: THREE.Quaternion,
  px: number,
  py: number,
  pz: number,
  scale: number,
) => {
  const hp = Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp ?? enemy.config.hp)));
  const shield = enemy.maxShield > 0 ? Math.max(0, Math.min(1, enemy.shield / enemy.maxShield)) : 0;
  if (hp < 1 || enemy.maxShield > 0) {
    const width = Math.max(0.65, scale * 2);
    dummy.quaternion.copy(cameraQuaternion);
    for (const key of BAR_KEYS) {
      const mesh = meshes[key];
      if (!mesh) continue;
      const fill = key === 'barHp' ? hp : key === 'barShield' ? shield : 1;
      if (fill === 0) continue;
      dummy.position.set(px, py, pz);
      dummy.translateX((-width * (1 - fill)) / 2);
      dummy.translateY(key === 'barShield' ? 0.12 : 0);
      dummy.translateZ(key === 'barTrack' ? 0 : 0.01);
      dummy.scale.set(width * fill, key === 'barTrack' ? 0.09 : 0.055, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(mesh.count++, dummy.matrix);
    }
  }
};

export const InstancedEnemies: React.FC = () => {
  const { setMeshRef } = useInstancedUpdater<EnemyEntity>((state) => state.enemies, {
    count: 1000,
    meshKeys: ENEMY_MESH_KEYS,
    compactKeys: COMPACT_KEYS,
    updateInstance: (i, enemy, dummy, meshes, { time, alpha, renderState, cameraQuaternion }) => {
      const prev = renderState.previousEnemyPositions.get(enemy.id) ?? enemy.position;
      const px = lerp(prev[0], enemy.position[0], alpha);
      const py = lerp(prev[1], enemy.position[1], alpha);
      const pz = lerp(prev[2], enemy.position[2], alpha);
      const scale = enemy.config.scale ?? 0.4;

      // 1. Body Mesh
      const body = meshes[enemy.type ?? 'Drone'] ?? meshes.Drone;
      if (body) {
        const bodyIndex = body.count++;
        dummy.position.set(px, py + scale + 0.1, pz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        body.setMatrixAt(bodyIndex, dummy.matrix);

        const isDashing = enemy.abilityActiveTimer > 0;
        const isFrozen = enemy.frozen > 0;
        let baseColor = enemy.config.color;
        if (isDashing) {
          baseColor = '#ffffff';
        } else if (isFrozen) {
          baseColor = '#00ffff';
        }
        TEMP_COLOR.set(baseColor).multiplyScalar(2.5);
        body.setColorAt(bodyIndex, TEMP_COLOR);
      }

      writeHealthBars(
        enemy,
        dummy,
        meshes,
        cameraQuaternion,
        px,
        py + scale * 2.6 + 0.22,
        pz,
        scale,
      );

      // 2. Shield Mesh
      if (meshes.shield != null) {
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
      if (meshes.ring != null) {
        dummy.position.set(px, py + scale + 0.1, pz);
        dummy.scale.set(scale * 2.0, scale * 2.0, scale * 2.0);
        dummy.rotation.set(time * 2, time, 0);
        dummy.updateMatrix();
        meshes.ring.setMatrixAt(i, dummy.matrix);

        TEMP_COLOR.set(enemy.config.color).multiplyScalar(0.6);
        meshes.ring.setColorAt(i, TEMP_COLOR);
      }
    },
  });

  return (
    <group>
      {BODY_TYPES.map((type) => (
        <instancedMesh
          key={type}
          ref={setMeshRef(type)}
          args={[undefined, undefined, 1000]}
          frustumCulled={false}
        >
          <EnemyGeometry type={type} />
          <meshBasicMaterial vertexColors toneMapped={false} />
        </instancedMesh>
      ))}
      {BAR_KEYS.map((key, index) => (
        <instancedMesh
          key={key}
          ref={setMeshRef(key)}
          args={[undefined, undefined, 1000]}
          frustumCulled={false}
        >
          <planeGeometry />
          <meshBasicMaterial color={BAR_COLORS[index]} toneMapped={false} />
        </instancedMesh>
      ))}

      <instancedMesh
        ref={setMeshRef('shield')}
        args={[undefined, undefined, 1000]}
        frustumCulled={false}
      >
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

      <instancedMesh
        ref={setMeshRef('ring')}
        args={[undefined, undefined, 1000]}
        frustumCulled={false}
      >
        <torusGeometry args={[0.7, 0.05, 8, 32]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
    </group>
  );
};
