import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

export const StarField = React.memo(({ count = 2000 }: { count?: number }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const r = 100 + Math.random() * 100; // Radius between 100 and 200
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      temp.push({
        position: new THREE.Vector3(x, y, z),
        scale: Math.random() * 0.5 + 0.2,
      });
    }
    return temp;
  }, [count]);

  React.useLayoutEffect(() => {
    if (!mesh.current) return;
    for (const [i, particle] of particles.entries()) {
      dummy.position.copy(particle.position);
      dummy.scale.set(particle.scale, particle.scale, particle.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [particles, dummy]);

  useFrame((state) => {
    if (!mesh.current) return;
    // Slow rotation only
    mesh.current.rotation.y = state.clock.getElapsedTime() * 0.05;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.2, 0]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
    </instancedMesh>
  );
});
