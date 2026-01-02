import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { TOWER_CONFIGS } from '../../constants';
import type { UpgradeType } from '../../types';
import { useGameUi, useRenderState } from '../GameState';
import { getTowerStats } from '../utils';

import { createComplexTowerBase } from './instancing/geometryUtils';
import { ensureInstanceColor, TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';

export const InstancedTowers: React.FC = () => {
  const { setSelectedEntityId, selectedEntityId, gameState } = useGameUi();
  const renderStateRef = useRenderState();
  const [baseGeometry, setBaseGeometry] = useState<THREE.BufferGeometry | null>(null);
  const baseMeshRef = useRef<THREE.InstancedMesh>(null);
  const turretMeshRef = useRef<THREE.InstancedMesh>(null);
  const ringMeshRef = useRef<THREE.InstancedMesh>(null);
  const rangeMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorCache = useRef<Map<string, THREE.Color>>(new Map());

  useLayoutEffect(() => {
    if (baseMeshRef.current) ensureInstanceColor(baseMeshRef.current, 100);
    if (turretMeshRef.current) ensureInstanceColor(turretMeshRef.current, 100);
    if (ringMeshRef.current) ensureInstanceColor(ringMeshRef.current, 100);
  }, []);

  useEffect(() => {
    const geo = createComplexTowerBase();
    setBaseGeometry(geo);
    return () => {
      geo.dispose();
    };
  }, []);

  const getCachedColor = (colorStr: string) => {
    if (!colorCache.current.has(colorStr)) {
      colorCache.current.set(colorStr, new THREE.Color(colorStr));
    }
    return colorCache.current.get(colorStr)!;
  };

  useFrame(({ clock }) => {
    const towers = renderStateRef.current.towers;
    const count = 100;

    if (baseMeshRef.current) ensureInstanceColor(baseMeshRef.current, count);
    if (turretMeshRef.current) ensureInstanceColor(turretMeshRef.current, count);
    if (ringMeshRef.current) ensureInstanceColor(ringMeshRef.current, count);

    const renderCount = Math.min(towers.length, count);
    const time = clock.getElapsedTime();

    if (baseMeshRef.current) baseMeshRef.current.count = renderCount;
    if (turretMeshRef.current) turretMeshRef.current.count = renderCount;
    if (ringMeshRef.current) ringMeshRef.current.count = renderCount;
    if (rangeMeshRef.current) rangeMeshRef.current.count = renderCount;

    for (let i = 0; i < renderCount; i++) {
      const tower = towers[i];
      const baseColor = TOWER_CONFIGS[tower.type as keyof typeof TOWER_CONFIGS]?.color ?? '#00ff00';
      const colorObj = getCachedColor(baseColor);

      if (baseMeshRef.current) {
        dummy.position.set(tower.position[0], tower.position[1], tower.position[2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        baseMeshRef.current.setMatrixAt(i, dummy.matrix);

        if (tower.id === selectedEntityId) {
          TEMP_COLOR.set('#ffffff');
        } else {
          TEMP_COLOR.copy(colorObj).multiplyScalar(1.0);
        }
        baseMeshRef.current.setColorAt(i, TEMP_COLOR);
      }

      if (turretMeshRef.current) {
        dummy.position.set(tower.position[0], tower.position[1], tower.position[2]);
        dummy.position.y += 0.8;
        const scale = 0.5 + tower.level * 0.1;
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.set(0, time, 0);
        dummy.updateMatrix();
        turretMeshRef.current.setMatrixAt(i, dummy.matrix);

        TEMP_COLOR.copy(colorObj).multiplyScalar(2.5);
        turretMeshRef.current.setColorAt(i, TEMP_COLOR);
      }

      if (ringMeshRef.current) {
        dummy.position.set(tower.position[0], tower.position[1], tower.position[2]);
        dummy.position.y += 0.8;

        dummy.rotation.x = Math.sin(time + i) * 0.2;
        dummy.rotation.y = time;
        const ringScale = 1.0 + Math.sin(time * 2 + i) * 0.1;
        dummy.scale.set(ringScale, ringScale, ringScale);

        dummy.updateMatrix();
        ringMeshRef.current.setMatrixAt(i, dummy.matrix);

        TEMP_COLOR.copy(colorObj).multiplyScalar(0.8);
        ringMeshRef.current.setColorAt(i, TEMP_COLOR);
      }

      if (rangeMeshRef.current) {
        if (tower.id === selectedEntityId) {
          const stats = getTowerStats(
            tower.type,
            tower.level,
            gameState.upgrades as { [key in UpgradeType]?: number },
          );
          dummy.position.set(tower.position[0], tower.position[1], tower.position[2]);
          dummy.position.y += 0.1;
          dummy.rotation.set(Math.PI / 2, 0, 0);
          dummy.scale.set(stats.range, stats.range, 1);
          dummy.updateMatrix();
          rangeMeshRef.current.setMatrixAt(i, dummy.matrix);
          TEMP_COLOR.set('#00ffff');
          rangeMeshRef.current.setColorAt(i, TEMP_COLOR);
        } else {
          rangeMeshRef.current.setMatrixAt(i, ZERO_MATRIX);
        }
      }
    }

    if (baseMeshRef.current) {
      baseMeshRef.current.instanceMatrix.needsUpdate = true;
      if (baseMeshRef.current.instanceColor) {
        baseMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
    if (turretMeshRef.current) {
      turretMeshRef.current.instanceMatrix.needsUpdate = true;
      if (turretMeshRef.current.instanceColor) {
        turretMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
    if (ringMeshRef.current) {
      ringMeshRef.current.instanceMatrix.needsUpdate = true;
      if (ringMeshRef.current.instanceColor) {
        ringMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
    if (rangeMeshRef.current) {
      rangeMeshRef.current.instanceMatrix.needsUpdate = true;
      if (rangeMeshRef.current.instanceColor) {
        rangeMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const tower = renderStateRef.current.towers[e.instanceId];
    if (tower) {
      setSelectedEntityId(tower.id);
    }
  };

  if (!baseGeometry) return null;

  return (
    <group>
      <instancedMesh
        ref={baseMeshRef}
        args={[baseGeometry, undefined, 100]}
        onPointerDown={handlePointerDown}
        frustumCulled={false}
      >
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={turretMeshRef}
        args={[undefined, undefined, 100]}
        raycast={() => null}
        frustumCulled={false}
      >
        <octahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={ringMeshRef}
        args={[undefined, undefined, 100]}
        raycast={() => null}
        frustumCulled={false}
      >
        <torusGeometry args={[0.6, 0.05, 8, 32]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={rangeMeshRef}
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

