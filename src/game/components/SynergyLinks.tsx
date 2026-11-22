import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { SynergyType, type TowerEntity } from '../../types';
import { useRenderState } from '../gameContexts';

const SYNERGY_COLORS: Record<SynergyType, THREE.Color> = {
  [SynergyType.SYNCHRONIZED_FIRE]: new THREE.Color('#00f2ff').multiplyScalar(2.5),
  [SynergyType.TRIANGULATION]: new THREE.Color('#9d00ff').multiplyScalar(3.5),
  [SynergyType.COVER_FIRE_SOURCE]: new THREE.Color('#00ff00').multiplyScalar(2.5),
  [SynergyType.COVER_FIRE_RECEIVER]: new THREE.Color('#00ff00').multiplyScalar(2.5),
};

const sameTopology = (previous: readonly TowerEntity[], towers: readonly TowerEntity[]) =>
  previous.length === towers.length &&
  previous.every((tower, index) => {
    const next = towers[index];
    return (
      tower.id === next.id &&
      tower.position[0] === next.position[0] &&
      tower.position[2] === next.position[2] &&
      tower.activeSynergies === next.activeSynergies
    );
  });

function updateGeometry(geometry: THREE.BufferGeometry, towers: readonly TowerEntity[]) {
  const towerMap = new Map(towers.map((tower) => [tower.id, tower]));
  const processedLinks = new Set<string>();
  const positions: number[] = [];
  const colors: number[] = [];

  for (const tower of towers) {
    if (!tower.activeSynergies) continue;

    for (const synergy of tower.activeSynergies) {
      const partner = towerMap.get(synergy.partnerId);
      if (!partner) continue;

      const [first, second] = [tower.id, partner.id].sort();
      const type =
        synergy.type === SynergyType.COVER_FIRE_RECEIVER
          ? SynergyType.COVER_FIRE_SOURCE
          : synergy.type;
      const key = JSON.stringify([first, second, type]);
      if (processedLinks.has(key)) continue;
      processedLinks.add(key);

      positions.push(
        tower.position[0],
        1,
        tower.position[2],
        partner.position[0],
        1,
        partner.position[2],
      );
      const { r, g, b } = SYNERGY_COLORS[type];
      colors.push(r, g, b, r, g, b);
    }
  }

  // Release the existing GPU attributes before replacing them.
  geometry.dispose();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
}

export const SynergyLinks = () => {
  const renderStateRef = useRenderState();
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const previousTowersRef = useRef<readonly TowerEntity[]>([]);

  useFrame(({ clock }) => {
    const geometry = geometryRef.current;
    const material = materialRef.current;
    if (!geometry || !material) return;

    const towers = renderStateRef.current.towers;
    const previous = previousTowersRef.current;
    if (towers !== previous && !sameTopology(previous, towers)) {
      updateGeometry(geometry, towers);
    }
    previousTowersRef.current = towers;

    material.opacity = 0.65 + 0.25 * Math.sin(clock.elapsedTime * 4);
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial
        ref={materialRef}
        vertexColors
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
};
