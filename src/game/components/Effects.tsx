import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectEntity } from '../../types';

export const InstancedExplosions: React.FC<{ effects: EffectEntity[]; remove: (id: string) => void }> = ({
  effects,
  remove,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 2000; // Max particles
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Track processed effects to avoid re-spawning
  const processedRef = useRef<Set<string>>(new Set());

  // Particle system state
  // We need a flat array/pool for all particles
  const particlesRef = useRef({
    curIndex: 0,
    active: new Uint8Array(count),
    life: new Float32Array(count), // Remaining life
    maxLife: new Float32Array(count), // Total duration
    position: new Float32Array(count * 3),
    velocity: new Float32Array(count * 3),
    scale: new Float32Array(count),
    color: new Float32Array(count * 3), // RGB
    associatedEffectId: new Array(count).fill(null), // To track when to remove effect
  });

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const sys = particlesRef.current;

    // 1. Spawn new particles from new effects
    const now = state.clock.elapsedTime;

    effects.forEach(effect => {
      if (!processedRef.current.has(effect.id)) {
        processedRef.current.add(effect.id);

        // Spawn 20 particles
        const pCount = 20;
        const color = new THREE.Color((effect as any).color || '#ff0000');

        for (let i = 0; i < pCount; i++) {
            const idx = (sys.curIndex + i) % count;
            sys.active[idx] = 1;
            sys.life[idx] = (effect.duration || 0.8);
            sys.maxLife[idx] = (effect.duration || 0.8);

            // Position
            sys.position[idx * 3] = effect.position.x;
            sys.position[idx * 3 + 1] = effect.position.y;
            sys.position[idx * 3 + 2] = effect.position.z;

            // Velocity (Random sphere)
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = (Math.random() * 5 + 5); // Speed match original
            const vx = Math.sin(phi) * Math.cos(theta) * speed;
            const vy = Math.sin(phi) * Math.sin(theta) * speed;
            const vz = Math.cos(phi) * speed;

            sys.velocity[idx * 3] = vx;
            sys.velocity[idx * 3 + 1] = vy;
            sys.velocity[idx * 3 + 2] = vz;

            sys.scale[idx] = (effect.scale || 0.4);
            sys.color[idx * 3] = color.r;
            sys.color[idx * 3 + 1] = color.g;
            sys.color[idx * 3 + 2] = color.b;
            sys.associatedEffectId[idx] = effect.id;
        }
        sys.curIndex = (sys.curIndex + pCount) % count;
      }
    });

    // 2. Update and Render active particles

    // Also track which effects have at least one active particle
    const activeEffectIds = new Set<string>();

    for (let i = 0; i < count; i++) {
        if (sys.active[i]) {
            sys.life[i] -= delta;

            if (sys.life[i] <= 0) {
                sys.active[i] = 0;
                // Cleanup processed set if totally done?
                // We handle cleanup via `activeEffectIds` check below.
            } else {
                // Physics
                sys.position[i * 3] += sys.velocity[i * 3] * delta;
                sys.position[i * 3 + 1] += sys.velocity[i * 3 + 1] * delta;
                sys.position[i * 3 + 2] += sys.velocity[i * 3 + 2] * delta;

                // Update Instance
                dummy.position.set(
                    sys.position[i * 3],
                    sys.position[i * 3 + 1],
                    sys.position[i * 3 + 2]
                );

                // Scale down logic: max(0, 0.3 * (1 - elapsed / total))
                // In original: scale = 0.3 * (1 - elapsed/duration)
                // elapsed = maxLife - life
                // factor = (life / maxLife)
                const s = Math.max(0, sys.scale[i] * (sys.life[i] / sys.maxLife[i]));
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();

                meshRef.current.setMatrixAt(i, dummy.matrix);
                meshRef.current.setColorAt(i, new THREE.Color(sys.color[i * 3], sys.color[i * 3 + 1], sys.color[i * 3 + 2]));

                activeEffectIds.add(sys.associatedEffectId[i]);
            }
        } else {
             // Hide inactive
             meshRef.current.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
        }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    // 3. Cleanup Effect States
    // If an effect ID is in `effects` but NOT in `activeEffectIds`, AND we have processed it, it means it's done.
    effects.forEach(e => {
        if (processedRef.current.has(e.id) && !activeEffectIds.has(e.id)) {
            // Delay removal slightly or just remove custom logic?
            // Original logic: remove(data.id) when time > duration.
            // Here: remove when ALL particles are dead. This is safer/better visually.
            remove(e.id);
            processedRef.current.delete(e.id);
        }
    });
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};
