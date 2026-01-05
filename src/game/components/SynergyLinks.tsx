import { useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import * as THREE from 'three';

import { SynergyType } from '../../types';
import { useRenderState } from '../GameState';

const SYNERGY_COLORS: Record<SynergyType, THREE.Color> = {
  [SynergyType.SYNCHRONIZED_FIRE]: new THREE.Color('#00f2ff'), // Cyan
  [SynergyType.TRIANGULATION]: new THREE.Color('#9d00ff'), // Purple
  [SynergyType.COVER_FIRE_SOURCE]: new THREE.Color('#00ff00'), // Green
  [SynergyType.COVER_FIRE_RECEIVER]: new THREE.Color('#00ff00'), // Green
};

export const SynergyLinks: React.FC = () => {
  const renderStateRef = useRenderState();
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  // Create a pool of positions to avoid allocations every frame?
  // For simplicity, we'll recreate the position attribute if needed,
  // but since topology changes only on build/sell, we can perhaps optimize.
  // Visuals pulse, so maybe geometry is static but material changes?
  // The design says "pulsing cyan laser" etc.
  // We can use a shader material or just animate colors/opacity.
  // For MVP: LineSegments with vertex colors.

  useFrame(({ clock }) => {
    if (!geometryRef.current) return;

    const towers = renderStateRef.current.towers;
    const positions: number[] = [];
    const colors: number[] = [];
    const time = clock.getElapsedTime();

    // Map needed to find partner positions
    const towerMap = new Map<string, (typeof towers)[0]>();
    for (const t of towers) towerMap.set(t.id, t);

    const processedLinks = new Set<string>();

    for (const tower of towers) {
      // Tower Position
      const tPos = tower.position; // [x, y, z] is world pos?
      // In toTowerEntity: [grid * TILE, 0.5, grid * TILE]
      // We want lines to be a bit higher, say y=1.0 to clear base meshes.
      const y = 1.0;

      if (!tower.activeSynergies) continue;

      for (const syn of tower.activeSynergies) {
        // Unique key for strict undirected graph: sort IDs
        const ids = [tower.id, syn.partnerId].sort();
        const linkKey = `${ids[0]}-${ids[1]}-${syn.type}`;

        if (processedLinks.has(linkKey)) continue;
        processedLinks.add(linkKey);

        const partner = towerMap.get(syn.partnerId);
        if (!partner) continue;

        // Add line segment
        // From
        positions.push(tPos[0], y, tPos[2]);
        // To
        positions.push(partner.position[0], y, partner.position[2]);

        // Color
        // If pulsing, we can mod luminance.
        const baseColor = SYNERGY_COLORS[syn.type] ?? new THREE.Color(1, 1, 1);

        // Pulse logic
        let intensity = 1.0;
        if (syn.type === SynergyType.SYNCHRONIZED_FIRE) {
          intensity = 0.5 + 0.5 * Math.sin(time * 10);
        } else if (syn.type === SynergyType.TRIANGULATION) {
          intensity = 0.8 + 0.2 * Math.sin(time * 2);
        } else {
          // Flow effect?
          intensity = 0.5 + 0.5 * Math.sin(time * 3 + tPos[0]);
        }

        const r = baseColor.r * intensity;
        const g = baseColor.g * intensity;
        const b = baseColor.b * intensity;

        // Push colors for both vertices
        colors.push(r, g, b);
        colors.push(r, g, b);
      }
    }

    // Update geometry
    const geo = geometryRef.current;
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeBoundingSphere();
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial vertexColors transparent opacity={0.6} toneMapped={false} linewidth={2} />
    </lineSegments>
  );
};
