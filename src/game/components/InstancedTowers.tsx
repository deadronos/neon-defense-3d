import type { ThreeEvent } from '@react-three/fiber';
import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';

import { TOWER_CONFIGS } from '../../constants';
import { TowerType } from '../../types';
import type { TowerEntity } from '../../types';
import { lerp } from '../../utils/math';
import { useGameUi, useRenderState } from '../gameContexts';
import { getTowerStats } from '../utils';

import { createComplexTowerBase, createTurretGeometry } from './instancing/geometryUtils';
import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';
import { useInstancedUpdater } from './instancing/useInstancedUpdater';

const TURRET_TYPES = Object.values(TowerType);
const TOWER_MESH_KEYS = ['base', ...TURRET_TYPES, 'ring', 'range'];

export const InstancedTowers: React.FC = () => {
  const { setSelectedEntityId, selectedEntityId, gameState } = useGameUi();
  const [geometry, setGeometry] = useState<{
    base: THREE.BufferGeometry;
    turrets: THREE.BufferGeometry[];
  } | null>(null);

  const colorCache = useRef<Map<string, THREE.Color>>(new Map());

  const getCachedColor = (colorStr: string) => {
    if (!colorCache.current.has(colorStr)) {
      colorCache.current.set(colorStr, new THREE.Color(colorStr));
    }
    return colorCache.current.get(colorStr)!;
  };

  useEffect(() => {
    const base = createComplexTowerBase();
    const turrets = TURRET_TYPES.map(createTurretGeometry);
    setGeometry({ base, turrets });
    return () => {
      base.dispose();
      for (const turret of turrets) turret.dispose();
    };
  }, []);

  const { setMeshRef } = useInstancedUpdater<TowerEntity>((state) => state.towers, {
    count: 100,
    meshKeys: TOWER_MESH_KEYS,
    compactKeys: TURRET_TYPES,
    updateInstance: (i, tower, dummy, meshes, { time, alpha, renderState }) => {
      const baseColor = TOWER_CONFIGS[tower.type].color;
      const colorObj = getCachedColor(baseColor);

      // Base
      if (meshes.base != null) {
        dummy.position.set(tower.position[0], tower.position[1], tower.position[2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        meshes.base.setMatrixAt(i, dummy.matrix);

        if (tower.id === selectedEntityId) {
          TEMP_COLOR.set('#ffffff');
        } else {
          TEMP_COLOR.copy(colorObj).multiplyScalar(1.0);
        }
        meshes.base.setColorAt(i, TEMP_COLOR);
      }

      // Turret
      const turret = meshes[tower.type];
      if (turret) {
        const turretIndex = turret.count++;
        dummy.position.set(tower.position[0], tower.position[1], tower.position[2]);
        dummy.position.y += 0.8;
        const scale = 0.5 + tower.level * 0.1;
        dummy.scale.set(scale, scale, scale);
        const target = renderState.enemiesById.get(tower.targetId ?? '');
        const previous = target
          ? (renderState.previousEnemyPositions.get(target.id) ?? target.position)
          : undefined;
        const angle =
          target && previous
            ? Math.atan2(
                lerp(previous[0], target.position[0], alpha) - tower.position[0],
                lerp(previous[2], target.position[2], alpha) - tower.position[2],
              )
            : time * 0.35;
        dummy.rotation.set(0, angle, 0);
        dummy.updateMatrix();
        turret.setMatrixAt(turretIndex, dummy.matrix);

        TEMP_COLOR.copy(colorObj).multiplyScalar(2.5);
        turret.setColorAt(turretIndex, TEMP_COLOR);
      }

      // Ring
      if (meshes.ring != null) {
        dummy.position.set(tower.position[0], tower.position[1], tower.position[2]);
        dummy.position.y += 0.8;

        dummy.rotation.set(Math.sin(time + i) * 0.2, time, 0);
        const ringScale = 1.0 + Math.sin(time * 2 + i) * 0.1;
        dummy.scale.set(ringScale, ringScale, ringScale);

        dummy.updateMatrix();
        meshes.ring.setMatrixAt(i, dummy.matrix);

        TEMP_COLOR.copy(colorObj).multiplyScalar(0.8);
        meshes.ring.setColorAt(i, TEMP_COLOR);
      }

      // Range
      if (meshes.range != null) {
        const rangeMesh = meshes.range;
        // default to empty matrix
        rangeMesh.setMatrixAt(i, ZERO_MATRIX);

        if (tower.id === selectedEntityId) {
          const stats = getTowerStats(tower.type, tower.level, {
            upgrades: gameState.upgrades,
            activeSynergies: tower.activeSynergies,
          });
          dummy.position.set(tower.position[0], tower.position[1], tower.position[2]);
          dummy.position.y += 0.1;
          dummy.rotation.set(Math.PI / 2, 0, 0);
          dummy.scale.set(stats.range, stats.range, 1);
          dummy.updateMatrix();
          rangeMesh.setMatrixAt(i, dummy.matrix);
          TEMP_COLOR.set('#00ffff');
          rangeMesh.setColorAt(i, TEMP_COLOR);
        }
      }
    },
  });

  const renderStateRef = useRenderState();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const towers = renderStateRef.current.towers;
    const tower = towers[e.instanceId];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (tower === undefined) return;
    setSelectedEntityId(tower.id);
  };

  if (!geometry) return null;

  return (
    <group>
      <instancedMesh
        ref={setMeshRef('base')}
        args={[geometry.base, undefined, 100]}
        onPointerDown={handlePointerDown}
        frustumCulled={false}
      >
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>

      {TURRET_TYPES.map((type, index) => (
        <instancedMesh
          key={type}
          ref={setMeshRef(type)}
          args={[geometry.turrets[index], undefined, 100]}
          raycast={() => null}
          frustumCulled={false}
        >
          <meshBasicMaterial vertexColors toneMapped={false} />
        </instancedMesh>
      ))}

      <instancedMesh
        ref={setMeshRef('ring')}
        args={[undefined, undefined, 100]}
        raycast={() => null}
        frustumCulled={false}
      >
        <torusGeometry args={[0.6, 0.05, 8, 32]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={setMeshRef('range')}
        args={[undefined, undefined, 100]}
        raycast={() => null}
        frustumCulled={false}
      >
        <torusGeometry args={[1, 0.05, 8, 64]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.3} depthWrite={false} />
      </instancedMesh>
    </group>
  );
};
