import { OrbitControls, useCursor, SoftShadows, Ring } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import React, { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

import {
  MAP_GRID,
  TILE_SIZE,
  COLORS,
  TOWER_CONFIGS,
  MAP_WIDTH,
  MAP_HEIGHT,
  PATH_WAYPOINTS,
  ENEMY_TYPES,
} from '../constants';
import type { TowerType, EnemyEntity, TowerEntity, ProjectileEntity, EffectEntity } from '../types';
import { TileType } from '../types';
import { useGame } from './GameState';
import { StarField } from './StarField';

/**
 * Calculates the statistics for a tower based on its type and current level.
 */
export const getTowerStats = (type: TowerType, level: number) => {
  const base = TOWER_CONFIGS[type];
  return {
    damage: base.damage * (1 + (level - 1) * 0.25),
    range: base.range * (1 + (level - 1) * 0.1),
    cooldown: Math.max(0.1, base.cooldown * (1 - (level - 1) * 0.05)),
    upgradeCost: Math.floor(base.cost * Math.pow(1.5, level)),
  };
};

/**
 * Component that hooks into the render loop to handle game logic updates.
 */
const GameLoopBridge = () => {
  const {
    gameState,
    enemies,
    towers,
    projectiles,
    setEnemies,
    setProjectiles,
    setTowers,
    setGameState,
    setEffects,
    updateWave,
  } = useGame();

  useFrame((state, delta) => {
    if (gameState.gameStatus !== 'playing') return;

    // Delegate wave management
    if (updateWave) updateWave(delta, enemies);

    // Enemy Move
    setEnemies((prev) => {
      let hpLoss = 0;
      const next = prev
        .map((e) => {
          const newEnemy = { ...e } as any;

          // Ability Logic (Dash)
          let currentSpeed = newEnemy.config.speed;
          if (newEnemy.config.abilities?.includes('dash')) {
            if (newEnemy.abilityActiveTimer > 0) {
              newEnemy.abilityActiveTimer -= delta;
              currentSpeed *= 3.0;
            } else {
              newEnemy.abilityCooldown -= delta;
              if (newEnemy.abilityCooldown <= 0) {
                newEnemy.abilityActiveTimer = 0.5;
                newEnemy.abilityCooldown = 4.0;
              }
            }
          }

          const p1 = PATH_WAYPOINTS[newEnemy.pathIndex];
          const p2 = PATH_WAYPOINTS[newEnemy.pathIndex + 1];

          if (!p2) {
            hpLoss++;
            return null;
          }

          const totalDist =
            Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2)) * TILE_SIZE;
          const move = currentSpeed * delta;
          newEnemy.progress += move / totalDist;

          if (newEnemy.progress >= 1) {
            newEnemy.progress = 0;
            newEnemy.pathIndex++;
            if (newEnemy.pathIndex >= PATH_WAYPOINTS.length - 1) {
              hpLoss++;
              return null;
            }
          }

          const pp1 = PATH_WAYPOINTS[newEnemy.pathIndex];
          const pp2 = PATH_WAYPOINTS[newEnemy.pathIndex + 1] || pp1;
          newEnemy.position = new THREE.Vector3(
            (pp1[0] + (pp2[0] - pp1[0]) * newEnemy.progress) * TILE_SIZE,
            1,
            (pp1[1] + (pp2[1] - pp1[1]) * newEnemy.progress) * TILE_SIZE,
          );
          return newEnemy;
        })
        .filter((e): e is EnemyEntity => e !== null);

      if (hpLoss > 0) {
        setGameState((g) => ({
          ...g,
          lives: Math.max(0, g.lives - hpLoss),
          gameStatus: g.lives - hpLoss <= 0 ? 'gameover' : g.gameStatus,
        }));
      }
      return next;
    });

    // Towers Firing
    const now = state.clock.elapsedTime;
    setTowers((prevTowers) => {
      const newProjs: ProjectileEntity[] = [];
      const updatedTowers = prevTowers.map((t) => {
        const stats = getTowerStats(t.type, t.level);

        if (now - t.lastFired < stats.cooldown) return t;

        let target: EnemyEntity | null = null;
        let minDist = Infinity;
        const tPos = t.position;

        for (const e of enemies) {
          const d = tPos.distanceTo(e.position);
          if (d <= stats.range && d < minDist) {
            minDist = d;
            target = e;
          }
        }

        if (target) {
          newProjs.push({
            id: Math.random().toString(),
            startPos: t.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
            targetId: target.id,
            speed: 20,
            progress: 0,
            damage: stats.damage,
            color: TOWER_CONFIGS[t.type as TowerType].color,
          } as any);
          return { ...t, lastFired: now, targetId: target.id };
        }
        return t;
      });

      if (newProjs.length) setProjectiles((p) => [...p, ...newProjs]);
      return updatedTowers;
    });

    // Projectile Move & Collision
    setProjectiles((prev) => {
      const hits: Record<string, number> = {};
      const active = prev
        .map((p) => {
          const newP = { ...p } as any;
          const t = enemies.find((e) => e.id === newP.targetId);
          if (!t) return null;

          newP.progress += delta * 3;
          if (newP.progress >= 1) {
            hits[newP.targetId] = (hits[newP.targetId] || 0) + newP.damage;
            return null;
          }
          return newP;
        })
        .filter((p): p is ProjectileEntity => p !== null);

      if (Object.keys(hits).length > 0) {
        setEnemies((currentEnemies) => {
          const nextEnemies: EnemyEntity[] = [];
          let moneyGained = 0;
          const newEffects: EffectEntity[] = [];

          for (const e of currentEnemies) {
            const damage = hits[e.id] || 0;
            if (damage > 0) {
              let shieldDamage = 0;
              let hpDamage = 0;

              const currentShield = e.shield || 0;

              if (currentShield > 0) {
                if (damage >= currentShield) {
                  shieldDamage = currentShield;
                  hpDamage = damage - currentShield;
                } else {
                  shieldDamage = damage;
                }
              } else {
                hpDamage = damage;
              }

              const remainingShield = currentShield - shieldDamage;
              const remainingHp = e.hp - hpDamage;

              if (remainingHp <= 0) {
                moneyGained += e.config.reward;
                newEffects.push({
                  id: Math.random().toString(),
                  type: 'explosion',
                  position: e.position.clone(),
                  color: e.config.color,
                  scale: e.config.scale || 0.4,
                  createdAt: state.clock.elapsedTime,
                  duration: 0.8,
                } as any);
                continue;
              } else {
                nextEnemies.push({ ...e, hp: remainingHp, shield: remainingShield });
              }
            } else {
              nextEnemies.push(e);
            }
          }

          if (moneyGained > 0 || newEffects.length > 0) {
            setTimeout(() => {
              if (moneyGained > 0) setGameState((g) => ({ ...g, money: g.money + moneyGained }));
              if (newEffects.length > 0) setEffects((prev) => [...prev, ...newEffects]);
            }, 0);
          }
          return nextEnemies;
        });
      }
      return active;
    });
  });

  return null;
};

// --- Components ---

const Tile: React.FC<{ x: number; z: number; type: TileType }> = ({ x, z, type }) => {
  const { placeTower, selectedTower, isValidPlacement, gameState, setSelectedEntityId } = useGame();
  const [hovered, setHovered] = useState(false);

  let color = '#000000';
  let emissive = '#000000';
  let emissiveIntensity = 0;

  if (type === TileType.Path) {
    color = '#001133';
    emissive = '#0088ff';
    emissiveIntensity = 0.5;
  } else if (type === TileType.Spawn) {
    color = '#330000';
    emissive = '#ff0000';
    emissiveIntensity = 0.8;
  } else if (type === TileType.Base) {
    color = '#110033';
    emissive = '#ff00ff';
    emissiveIntensity = 0.8;
  } else {
    // Grass / Empty
    color = '#050510';
  }

  if (hovered && selectedTower && type === TileType.Grass && gameState.gameStatus === 'playing') {
    const valid = isValidPlacement(x, z);
    color = valid ? '#003300' : '#330000';
    emissive = valid ? '#00ff00' : '#ff0000';
    emissiveIntensity = 0.5;
  }

  return (
    <group position={[x * TILE_SIZE, 0, z * TILE_SIZE]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (gameState.gameStatus !== 'playing') return;
          if (selectedTower) {
            placeTower(x, z, selectedTower);
          } else {
            setSelectedEntityId(null);
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[TILE_SIZE * 0.95, TILE_SIZE * 0.95]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      {/* Grid Border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
        <meshBasicMaterial color="#1a1a40" wireframe />
      </mesh>
    </group>
  );
};

const InstancedEnemies: React.FC<{ enemies: EnemyEntity[] }> = ({ enemies }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const shieldRef = useRef<THREE.InstancedMesh>(null);
  const count = 1000;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current || !shieldRef.current) return;

    enemies.forEach((enemy, i) => {
      if (i >= count) return;

      const scale = enemy.config.scale || 0.4;

      // Update Body
      dummy.position.copy(enemy.position);
      dummy.position.y += scale + 0.1;
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);

      // Color logic
      const isDashing = enemy.abilityActiveTimer > 0;
      const baseColor = isDashing ? '#ffffff' : enemy.config.color;
      // High intensity color for neon look
      const color = new THREE.Color(baseColor).multiplyScalar(2);
      meshRef.current?.setColorAt(i, color);

      // Update Shield
      if (enemy.shield > 0) {
         dummy.scale.set(scale * 1.5, scale * 1.5, scale * 1.5);
         dummy.updateMatrix();
         shieldRef.current?.setMatrixAt(i, dummy.matrix);
         shieldRef.current?.setColorAt(i, new THREE.Color('#00ffff'));
      } else {
         shieldRef.current?.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      }
    });

    // Hide unused
    for (let i = enemies.length; i < count; i++) {
       meshRef.current?.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
       shieldRef.current?.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    shieldRef.current.instanceMatrix.needsUpdate = true;
    if (shieldRef.current.instanceColor) shieldRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={shieldRef} args={[undefined, undefined, count]}>
         <sphereGeometry args={[1, 16, 16]} />
         <meshBasicMaterial
            color="white"
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
         />
      </instancedMesh>
    </group>
  );
};

const Tower: React.FC<{ data: TowerEntity; enemies: EnemyEntity[] }> = ({ data, enemies }) => {
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

const InstancedProjectiles: React.FC<{
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
        
        activeCount++;
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

const InstancedExplosions: React.FC<{ effects: EffectEntity[]; remove: (id: string) => void }> = ({
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
    let activeCount = 0;
    
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

const World = () => {
  return (
    <group
      position={[
        (-MAP_WIDTH * TILE_SIZE) / 2 + TILE_SIZE / 2,
        0,
        (-MAP_HEIGHT * TILE_SIZE) / 2 + TILE_SIZE / 2,
      ]}
    >
      {MAP_GRID.map((row, z) =>
        row.map((type, x) => <Tile key={`${x}-${z}`} x={x} z={z} type={type} />),
      )}
    </group>
  );
};

const SceneContent = () => {
  const { enemies, towers, projectiles, effects, setEffects } = useGame();

  const offsetX = (-MAP_WIDTH * TILE_SIZE) / 2 + TILE_SIZE / 2;
  const offsetZ = (-MAP_HEIGHT * TILE_SIZE) / 2 + TILE_SIZE / 2;

  const removeEffect = (id: string) => {
    setEffects((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <>
      <StarField count={3000} />

      {/* Dark Ambient & Rim Lighting */}
      <ambientLight intensity={0.1} />
      <directionalLight position={[-10, 20, -10]} intensity={0.5} color="#4444ff" />
      <directionalLight position={[10, 5, 10]} intensity={0.5} color="#ff00ff" />

      <GameLoopBridge />

      <World />

      <group position={[offsetX, 0, offsetZ]}>
        {towers.map((t) => (
          <Tower key={t.id} data={t} enemies={enemies} />
        ))}
        <InstancedEnemies enemies={enemies} />
        <InstancedProjectiles projectiles={projectiles} enemies={enemies} />
        {effects.length > 0 && (
           <InstancedExplosions effects={effects} remove={removeEffect} />
        )}
      </group>

      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.5}
        minDistance={10}
        maxDistance={50}
      />

      <SoftShadows size={10} samples={8} />

      {/* Post Processing */}
      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.6} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        <ChromaticAberration
          offset={new THREE.Vector2(0.002, 0.002)}
          radialModulation={false}
          modulationOffset={0}
        />
      </EffectComposer>
    </>
  );
};

export const GameCanvas = () => {
  return (
    <div className="w-full h-full bg-[#03030b]">
      <Canvas
        shadows
        camera={{ position: [0, 25, 20], fov: 45 }}
        gl={{ toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
};
