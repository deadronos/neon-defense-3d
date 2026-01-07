import type { ThreeEvent } from '@react-three/fiber';
import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';

import { TOWER_CONFIGS } from '../../constants';
import type { UpgradeType, TowerEntity } from '../../types';
import { useGameUi, useRenderState } from '../gameContexts';
import { getTowerStats } from '../utils';

import { createComplexTowerBase } from './instancing/geometryUtils';
import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';
import { useInstancedUpdater } from './instancing/useInstancedUpdater';

export const InstancedTowers: React.FC = () => {
  const { setSelectedEntityId, selectedEntityId, gameState } = useGameUi();
  const [baseGeometry, setBaseGeometry] = useState<THREE.BufferGeometry | null>(null);

  const colorCache = useRef<Map<string, THREE.Color>>(new Map());

  const getCachedColor = (colorStr: string) => {
    if (!colorCache.current.has(colorStr)) {
      colorCache.current.set(colorStr, new THREE.Color(colorStr));
    }
    return colorCache.current.get(colorStr)!;
  };

  useEffect(() => {
    const geo = createComplexTowerBase();
    setBaseGeometry(geo);
    return () => {
      geo.dispose();
    };
  }, []);

  const { setMeshRef } = useInstancedUpdater<TowerEntity>((state) => state.towers, {
    count: 100,
    meshKeys: ['base', 'turret', 'ring', 'range'],
    updateInstance: (i, tower, dummy, meshes, { time }) => {
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
      if (meshes.turret != null) {
        dummy.position.set(tower.position[0], tower.position[1], tower.position[2]);
        dummy.position.y += 0.8;
        const scale = 0.5 + tower.level * 0.1;
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.set(0, time, 0);
        dummy.updateMatrix();
        meshes.turret.setMatrixAt(i, dummy.matrix);

        TEMP_COLOR.copy(colorObj).multiplyScalar(2.5);
        meshes.turret.setColorAt(i, TEMP_COLOR);
      }

      // Ring
      if (meshes.ring != null) {
        dummy.position.set(tower.position[0], tower.position[1], tower.position[2]);
        dummy.position.y += 0.8;

        dummy.rotation.x = Math.sin(time + i) * 0.2;
        dummy.rotation.y = time;
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
            upgrades: gameState.upgrades as { [key in UpgradeType]?: number },
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
    // runtime guard: index access may be out-of-bounds at runtime
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (tower === undefined) return;
    setSelectedEntityId(tower.id);
  };

  if (!baseGeometry) return null;

  return (
    <group>
      <instancedMesh
        ref={setMeshRef('base')}
        args={[baseGeometry, undefined, 100]}
        onPointerDown={handlePointerDown}
        frustumCulled={false}
      >
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={setMeshRef('turret')}
        args={[undefined, undefined, 100]}
        raycast={() => null}
        frustumCulled={false}
      >
        <octahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>

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
