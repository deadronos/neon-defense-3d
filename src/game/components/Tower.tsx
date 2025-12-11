import { Ring } from '@react-three/drei';
import React from 'react';
import * as THREE from 'three';

import { TOWER_CONFIGS } from '../../constants';
import type { TowerEntity, TowerType, EnemyEntity } from '../../types';
import { useGame } from '../GameState';
import { getTowerStats } from '../utils';

export const Tower: React.FC<{ data: TowerEntity; enemies: EnemyEntity[] }> = ({
  data,
  enemies: _enemies,
}) => {
  const { selectedEntityId, setSelectedEntityId, selectedTower } = useGame();
  const config = TOWER_CONFIGS[data.type as TowerType];
  const stats = getTowerStats(data.type, data.level);

  const isSelected = selectedEntityId === data.id;

  return (
    <group
      position={data.position}
      onClick={(e) => {
        e.stopPropagation();
        if (!selectedTower) {
          setSelectedEntityId(data.id);
        }
      }}
    >
      {isSelected && (
        <Ring
          args={[stats.range - 0.05, stats.range, 64]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.1, 0]}
        >
          <meshBasicMaterial color={config.color} transparent opacity={0.3} toneMapped={false} />
        </Ring>
      )}

      {/* Base */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[1.5, 0.4, 1.5]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.5, 0.4, 1.5)]} />
          <lineBasicMaterial color={config.color} transparent opacity={0.5} />
        </lineSegments>
      </mesh>

      {/* Turret */}
      <mesh
        position={[0, 1, 0]}
        scale={[1 + (data.level - 1) * 0.1, 1 + (data.level - 1) * 0.1, 1 + (data.level - 1) * 0.1]}
      >
        <octahedronGeometry args={[0.5]} />
        <meshStandardMaterial
          color="black"
          emissive={config.color}
          emissiveIntensity={2}
          roughness={0}
        />
      </mesh>

      {/* Floating Rings */}
      <group position={[0, 1, 0]}>
        <Ring args={[0.6, 0.65, 32]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={config.color} toneMapped={false} />
        </Ring>
      </group>
    </group>
  );
};
