import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';

import type { TowerEntity, UpgradeType } from '../../types';
import { useGame } from '../GameState';
import { useInstancedEntities } from '../hooks/useInstancedEntities';

import { createComplexTowerBase } from './instancing/geometryUtils';
import { TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';
import { getTowerStats } from '../utils';

export const InstancedTowers: React.FC<{ towers: TowerEntity[] }> = ({ towers }) => {
  const { setSelectedEntityId, selectedEntityId, gameState } = useGame();
  const [baseGeometry, setBaseGeometry] = useState<THREE.BufferGeometry | null>(null);

  // Color Cache
  const colorCache = useRef<Map<string, THREE.Color>>(new Map());

  useEffect(() => {
    // Use shared utility for geometry
    const geo = createComplexTowerBase();
    setBaseGeometry(geo);
    return () => { geo.dispose(); }
  }, []);

  const getCachedColor = (colorStr: string) => {
    if (!colorCache.current.has(colorStr)) {
        colorCache.current.set(colorStr, new THREE.Color(colorStr));
    }
    return colorCache.current.get(colorStr)!;
  };

  // --- 1. Base Mesh (Static structure) ---
  const baseMeshRef = useInstancedEntities({
    entities: towers,
    count: 100,
    updateEntity: (tower, dummy, i, mesh) => {
        dummy.position.copy(tower.position);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        const baseColor = tower.config?.color || '#00ff00';
        const colorObj = getCachedColor(baseColor);

        // Highlight logic in shader/color
        if (tower.id === selectedEntityId) {
            TEMP_COLOR.set('#ffffff'); // Selected highlight
        } else {
            TEMP_COLOR.copy(colorObj).multiplyScalar(1.0);
        }
        mesh.setColorAt(i, TEMP_COLOR);
    },
  });

  // --- 2. Turret Mesh (Rotates, Scales with level) ---
  const turretMeshRef = useInstancedEntities({
    entities: towers,
    count: 100,
    updateEntity: (tower, dummy, i, mesh) => {
        dummy.position.copy(tower.position);
        dummy.position.y += 0.8; // Floating above base

        // Scale with level
        const scale = 0.5 + (tower.level * 0.1);
        dummy.scale.set(scale, scale, scale);

        // Idle spin
        dummy.rotation.y += 0.01;

        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        const baseColor = tower.config?.color || '#00ff00';
        const colorObj = getCachedColor(baseColor);
        TEMP_COLOR.copy(colorObj).multiplyScalar(2.0); // Bright neon
        mesh.setColorAt(i, TEMP_COLOR);
    }
  });

  // --- 3. Floating Ring (Decorative) ---
  const ringMeshRef = useInstancedEntities({
    entities: towers,
    count: 100,
    updateEntity: (tower, dummy, i, mesh) => {
        dummy.position.copy(tower.position);
        dummy.position.y += 0.8; // Same height as turret center

        // Oscillate and rotate
        const time = Date.now() * 0.001;
        dummy.rotation.x = Math.sin(time + i) * 0.2;
        dummy.rotation.y = time;

        const scale = 1.0 + Math.sin(time * 2 + i) * 0.1;
        dummy.scale.set(scale, scale, scale);

        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        const baseColor = tower.config?.color || '#00ff00';
        const colorObj = getCachedColor(baseColor);
        TEMP_COLOR.copy(colorObj).multiplyScalar(0.8);
        mesh.setColorAt(i, TEMP_COLOR);
    }
  });

  // --- 4. Range Ring (Visible on Selection) ---
  const rangeMeshRef = useInstancedEntities({
    entities: towers,
    count: 100,
    updateEntity: (tower, dummy, i, mesh) => {
        if (tower.id !== selectedEntityId) {
            mesh.setMatrixAt(i, ZERO_MATRIX);
            return;
        }

        const stats = getTowerStats(tower.type, tower.level, gameState.upgrades as { [key in UpgradeType]?: number });

        dummy.position.copy(tower.position);
        dummy.position.y += 0.1;

        // Torus is XY plane. Rotate 90deg on X to lay flat XZ.
        dummy.rotation.set(Math.PI / 2, 0, 0);

        // Scale: Torus radius=1. We want radius=range.
        dummy.scale.set(stats.range, stats.range, 1);

        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        TEMP_COLOR.set('#00ffff');
        mesh.setColorAt(i, TEMP_COLOR);
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const tower = towers[e.instanceId];
    if (tower) {
      setSelectedEntityId(tower.id);
    }
  };

  if (!baseGeometry) return null;

  return (
    <group>
        {/* Base */}
        <instancedMesh
            ref={baseMeshRef}
            args={[baseGeometry, undefined, 100]}
            onPointerDown={handlePointerDown}
        >
            <meshStandardMaterial toneMapped={false} />
        </instancedMesh>

        {/* Turret */}
        <instancedMesh ref={turretMeshRef} args={[undefined, undefined, 100]} raycast={() => null}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial toneMapped={false} />
        </instancedMesh>

        {/* Floating Ring */}
        <instancedMesh ref={ringMeshRef} args={[undefined, undefined, 100]} raycast={() => null}>
            <torusGeometry args={[0.6, 0.05, 8, 32]} />
            <meshStandardMaterial toneMapped={false} />
        </instancedMesh>

        {/* Range Ring */}
        <instancedMesh ref={rangeMeshRef} args={[undefined, undefined, 100]} raycast={() => null}>
            <torusGeometry args={[1, 0.05, 8, 64]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.3} depthWrite={false} />
        </instancedMesh>
    </group>
  );
};
