import * as THREE from 'three';
import { ParticlePool } from '../instancing/ParticlePool';

/**
 * Spawns an explosion effect into the particle pool.
 * @param pool - The particle pool to spawn into.
 * @param position - The center position of the explosion.
 * @param colorHex - The hex color string for the explosion.
 * @param effectId - The unique ID of the effect.
 * @param duration - Duration of the particles.
 * @param baseScale - Base scale of the particles.
 * @param particleCount - Number of particles to spawn.
 */
export function spawnExplosion(
  pool: ParticlePool,
  position: { x: number; y: number; z: number },
  colorHex: string,
  effectId: string,
  duration: number = 0.8,
  baseScale: number = 0.4,
  particleCount: number = 20
) {
  const color = new THREE.Color(colorHex);

  for (let i = 0; i < particleCount; i++) {
    // Velocity (Random sphere)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = Math.random() * 5 + 5; // Speed match original
    const vx = Math.sin(phi) * Math.cos(theta) * speed;
    const vy = Math.sin(phi) * Math.sin(theta) * speed;
    const vz = Math.cos(phi) * speed;

    pool.activateParticle(
      position.x,
      position.y,
      position.z,
      vx,
      vy,
      vz,
      color.r,
      color.g,
      color.b,
      baseScale,
      duration,
      effectId
    );
  }
}
