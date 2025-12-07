import { OrbitControls, useCursor, SoftShadows, Trail, Ring } from '@react-three/drei';
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

const Enemy: React.FC<{ data: EnemyEntity }> = ({ data }) => {
  const scale = (data as any).config.scale || 0.4;
  const isDashing = (data as any).abilityActiveTimer > 0;
  const color = isDashing ? '#ffffff' : (data as any).config.color;

  return (
    <group position={data.position}>
      <Trail
        width={scale * 2}
        length={6}
        color={new THREE.Color(color).multiplyScalar(2)}
        attenuation={(t) => t * t}
      >
        <mesh position={[0, scale + 0.1, 0]}>
          <dodecahedronGeometry args={[scale, 0]} />
          <meshStandardMaterial
            color="black"
            emissive={color}
            emissiveIntensity={2}
            roughness={0}
            metalness={1}
          />
        </mesh>
      </Trail>
      
      {/* Core Glow */}
      <pointLight 
        position={[0, scale + 0.1, 0]} 
        color={color} 
        intensity={2} 
        distance={3} 
        decay={2}
      />
      
      {/* Shield Visual */}
      {data.shield > 0 && (
         <mesh position={[0, scale + 0.1, 0]}>
           <sphereGeometry args={[scale * 1.5, 16, 16]} />
           <meshBasicMaterial 
             color="#00ffff" 
             transparent 
             opacity={0.3 + (data.shield / data.maxShield) * 0.4} 
             depthWrite={false} 
             blending={THREE.AdditiveBlending}
           />
         </mesh>
      )}
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
        <Ring args={[stats.range - 0.05, stats.range, 64]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
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

const Projectile: React.FC<{ data: ProjectileEntity; enemies: EnemyEntity[] }> = ({
  data,
  enemies,
}) => {
  const target = enemies.find((e) => e.id === data.targetId);
  if (!target) return null;

  const start = (data as any).startPos;
  const end = target.position;
  const x = start.x + (end.x - start.x) * data.progress;
  const y = start.y + (end.y - start.y) * data.progress;
  const z = start.z + (end.z - start.z) * data.progress;

  return (
    <group position={[x, y, z]}>
      <Trail
        width={0.2}
        length={4}
        color={new THREE.Color((data as any).color).multiplyScalar(10)}
        attenuation={(t) => t * t}
      >
        <mesh>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={(data as any).color} toneMapped={false} />
        </mesh>
      </Trail>
    </group>
  );
};

const Explosion: React.FC<{ data: EffectEntity; remove: (id: string) => void }> = ({
  data,
  remove,
}) => {
  const particlesRef = useRef<THREE.Group>(null);
  const particleCount = 20;

  const particles = useMemo(() => {
    return new Array(particleCount).fill(0).map(() => ({
      dir: new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize(),
      speed: Math.random() * 10 + 5,
    }));
  }, []);

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime - (data as any).createdAt;
    if (elapsed > (data as any).duration) {
      remove(data.id);
      return;
    }
    if (particlesRef.current) {
      particlesRef.current.children.forEach((child, i) => {
        const p = particles[i];
        if (p && child instanceof THREE.Mesh) {
          child.position.add(p.dir.clone().multiplyScalar(p.speed * delta));
          const scale = Math.max(0, 0.3 * (1 - elapsed / (data as any).duration));
          child.scale.set(scale, scale, scale);
        }
      });
    }
  });

  return (
    <group position={data.position}>
      <pointLight color={(data as any).color} intensity={5} distance={5} decay={2} />
      <mesh>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color={(data as any).color} toneMapped={false} transparent opacity={0.5} />
      </mesh>
      <group ref={particlesRef}>
        {particles.map((_, i) => (
          <mesh key={i} position={[0, 0, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshBasicMaterial color={(data as any).color} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
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
        {enemies.map((e) => (
          <Enemy key={e.id} data={e} />
        ))}
        {projectiles.map((p) => (
          <Projectile key={p.id} data={p} enemies={enemies} />
        ))}
        {effects.map((e) => (
          <Explosion key={e.id} data={e} remove={removeEffect} />
        ))}
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
        <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} radialModulation={false} modulationOffset={0} />
      </EffectComposer>
    </>
  );
};

export const GameCanvas = () => {
  return (
    <div className="w-full h-full bg-[#03030b]">
      <Canvas shadows camera={{ position: [0, 25, 20], fov: 45 }} gl={{ toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}>
        <SceneContent />
      </Canvas>
    </div>
  );
};
