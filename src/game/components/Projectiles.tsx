import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ProjectileEntity, EnemyEntity } from '../../types';

export const InstancedProjectiles: React.FC<{
  projectiles: ProjectileEntity[];
  enemies: EnemyEntity[];
}> = ({ projectiles, enemies }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 1000;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Precomute geometry alignment: Cylinder is Y-up, we want Z-forward for lookAt
  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
    geo.rotateX(Math.PI / 2); // Align with Z axis
    geo.translate(0, 0, 0.5); // Pivot at the back (start)? Or center?
    // If we lerp position, position is current point.
    // If it's a bolt, center is fine.
    // Let's reset translation and just keep rotation.
    // Actually, lookAt rotates the object around its center.
    return geo;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;

    // Optimization: Create a map for fast enemy lookup
    // Since enemies array is new every frame, this is O(N) which is fine
    const enemyMap = new Map<string, EnemyEntity>();
    for (const e of enemies) {
      enemyMap.set(e.id, e);
    }

    // Color cache for projectiles
    const colorCache = new Map<string, THREE.Color>();

    projectiles.forEach((p, i) => {
      if (i >= count) return;

      const pColor = (p as any).color; // Assuming color string
      let cached = colorCache.get(pColor);
      if (!cached) {
         cached = new THREE.Color(pColor).multiplyScalar(2);
         colorCache.set(pColor, cached);
      }

      const target = enemyMap.get(p.targetId || '');
      // ... rest of logic

      // If target exists, interpolate
      // If target dead, projectile usually removed by GameLoop,
      // but if frame lingers, we might point to last known?
      // For now, if no target, hide or just point to last known?
      // Note: Data doesn't persist targets position if dead.
      // We'll skip rendering if target missing (or it will glitch)
      if (target) {
        const start = (p as any).startPos;
        const end = target.position;

        // Lerp position
        const x = start.x + (end.x - start.x) * p.progress;
        const y = start.y + (end.y - start.y) * p.progress;
        const z = start.z + (end.z - start.z) * p.progress;

        dummy.position.set(x, y, z);
        dummy.lookAt(end);

        // Scale length based on speed or just fixed "long" bolt
        // p.speed is around 20.
        // Let's make it a nice long beam.
        const length = 1.5;
        dummy.scale.set(1, 1, length);

        dummy.updateMatrix();
        meshRef.current?.setMatrixAt(i, dummy.matrix);
        meshRef.current?.setColorAt(i, cached); // Boost emissive look
      } else {
        // Hide
         meshRef.current?.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      }
    });

    // Hide remaining unused instances
    for (let i = projectiles.length; i < count; i++) {
      meshRef.current.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]}>
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};
