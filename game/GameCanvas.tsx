import {
  OrbitControls,
  useCursor,
  SoftShadows,
  Line,
  Ring,
  Trail,
  Instance,
  Instances,
} from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import React, { useRef, useState, useMemo, useEffect } from 'react';
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

// Helper to calculate stats based on level
export const getTowerStats = (type: TowerType, level: number) => {
  const base = TOWER_CONFIGS[type];
  return {
    damage: base.damage * (1 + (level - 1) * 0.25), // +25% damage per level
    range: base.range * (1 + (level - 1) * 0.1), // +10% range per level
    cooldown: Math.max(0.1, base.cooldown * (1 - (level - 1) * 0.05)), // -5% cooldown per level
    upgradeCost: Math.floor(base.cost * Math.pow(1.5, level)),
  };
};

// Re-implementing logic bridge here to access Context
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
  } = useGame();

  const spawnTimerRef = useRef(0);

  useFrame((state, delta) => {
    if (gameState.gameStatus !== 'playing') return;

    spawnTimerRef.current -= delta;

    // Spawning
    if (spawnTimerRef.current <= 0) {
      const spawnInterval = Math.max(0.5, 2.5 - gameState.wave * 0.15);
      spawnTimerRef.current = spawnInterval;

      const startNode = PATH_WAYPOINTS[0];

      // Select Enemy Type
      const wave = gameState.wave;
      let typeConfig = ENEMY_TYPES.BASIC;
      const r = Math.random();

      // Simple director logic
      if (wave >= 2 && r > 0.7) typeConfig = ENEMY_TYPES.FAST;
      if (wave >= 4 && r > 0.85) typeConfig = ENEMY_TYPES.TANK;
      if (wave % 5 === 0 && r > 0.95) typeConfig = ENEMY_TYPES.BOSS;

      // Scaling logic
      const hp = typeConfig.hpBase * (1 + (wave - 1) * 0.4);

      const newEnemy: EnemyEntity = {
        id: Math.random().toString(36).substr(2, 9),
        config: {
          speed: typeConfig.speed,
          hp,
          reward: typeConfig.reward + Math.floor(wave * 2),
          color: typeConfig.color,
          scale: typeConfig.scale,
          abilities: typeConfig.abilities,
        },
        pathIndex: 0,
        progress: 0,
        position: new THREE.Vector3(startNode[0] * TILE_SIZE, 1, startNode[1] * TILE_SIZE),
        hp: hp,
        frozen: 0,
        abilityCooldown: 2 + Math.random() * 3, // Random start delay for ability
        abilityActiveTimer: 0,
      };

      setEnemies((prev) => [...prev, newEnemy]);
    }

    // Enemy Move
    setEnemies((prev) => {
      let hpLoss = 0;
      const next = prev
        .map((e) => {
          // Create shallow copy to avoid mutation
          const newEnemy = { ...e };

          // Ability Logic
          let currentSpeed = newEnemy.config.speed;

          if (newEnemy.config.abilities?.includes('dash')) {
            if (newEnemy.abilityActiveTimer > 0) {
              // Active Dash
              newEnemy.abilityActiveTimer -= delta;
              currentSpeed *= 3.0; // 3x Speed during dash
            } else {
              // Cooldown
              newEnemy.abilityCooldown -= delta;
              if (newEnemy.abilityCooldown <= 0) {
                // Trigger Dash
                newEnemy.abilityActiveTimer = 0.5; // Dash for 0.5s
                newEnemy.abilityCooldown = 4.0; // Cooldown 4s
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

          // Update pos with new Vector3 instance
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

    // Towers & Projectiles
    const now = state.clock.elapsedTime;
    setTowers((prevTowers) => {
      const newProjs: ProjectileEntity[] = [];
      const updatedTowers = prevTowers.map((t) => {
        const stats = getTowerStats(t.type, t.level);

        if (now - t.lastFired < stats.cooldown) return t;

        // Find target in *current* enemies
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
            startPos: tPos.clone().add(new THREE.Vector3(0, 1.5, 0)),
            targetId: target.id,
            speed: 20,
            progress: 0,
            damage: stats.damage,
            color: TOWER_CONFIGS[t.type as TowerType].color,
          });
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
          const newP = { ...p }; // Copy

          const t = enemies.find((e) => e.id === newP.targetId);
          if (!t) return null; // Target lost

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
              const remainingHp = e.hp - damage;
              if (remainingHp <= 0) {
                // Enemy Destroyed
                moneyGained += e.config.reward;
                // Add Explosion Effect
                newEffects.push({
                  id: Math.random().toString(),
                  type: 'explosion',
                  position: e.position.clone(),
                  color: e.config.color,
                  scale: e.config.scale || 0.4,
                  createdAt: state.clock.elapsedTime,
                  duration: 0.8,
                });
                continue; // Exclude from nextEnemies
              } else {
                nextEnemies.push({ ...e, hp: remainingHp });
              }
            } else {
              nextEnemies.push(e);
            }
          }

          // Update side effects outside of the reducer to avoid warnings, though setters are generally safe
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

  // Color mapping
  let color = COLORS.grass;
  if (type === TileType.Path) color = COLORS.path;
  if (type === TileType.Spawn) color = COLORS.spawn;
  if (type === TileType.Base) color = COLORS.base;
  if (hovered && selectedTower && type === TileType.Grass) {
    color = isValidPlacement(x, z) ? '#4ade80' : '#ef4444';
  }

  useCursor(hovered && !!selectedTower && gameState.gameStatus === 'playing');

  return (
    <mesh
      position={[x * TILE_SIZE, 0, z * TILE_SIZE]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (gameState.gameStatus !== 'playing') return;

        if (selectedTower) {
          placeTower(x, z, selectedTower);
        } else {
          // Deselect tower if clicking ground
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
        emissive={color}
        emissiveIntensity={0.2}
        roughness={0.1}
      />
    </mesh>
  );
};

const Enemy: React.FC<{ data: EnemyEntity }> = ({ data }) => {
  const scale = data.config.scale || 0.4;
  const hpBarY = scale * 2 + 0.5;
  const isDashing = data.abilityActiveTimer > 0;

  return (
    <group position={data.position}>
      {isDashing && (
        <Trail
          width={scale * 1.5}
          length={4}
          color={new THREE.Color('#ffffff')}
          attenuation={(t) => t * t}
        >
          <mesh visible={false} />
        </Trail>
      )}

      {/* Body */}
      <mesh castShadow receiveShadow position={[0, scale + 0.1, 0]}>
        <sphereGeometry args={[scale, 16, 16]} />
        <meshStandardMaterial
          color={isDashing ? '#ffffff' : data.config.color}
          emissive={isDashing ? '#ffffff' : data.config.color}
          emissiveIntensity={isDashing ? 2 : 0.5}
        />
      </mesh>
      {/* Health Bar */}
      <mesh position={[0, hpBarY, 0]}>
        <planeGeometry args={[1, 0.15]} />
        <meshBasicMaterial color="black" />
      </mesh>
      <mesh
        position={[-0.5 + (data.hp / 100) * 0.5, hpBarY, 0.01]}
        scale={[Math.max(0, Math.min(1, data.hp / 100)), 1, 1]}
      >
        <planeGeometry args={[1, 0.1]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
    </group>
  );
};

const Tower: React.FC<{ data: TowerEntity; enemies: EnemyEntity[] }> = ({ data, enemies }) => {
  const { selectedEntityId, setSelectedEntityId, selectedTower } = useGame();
  const config = TOWER_CONFIGS[data.type as TowerType];
  const stats = getTowerStats(data.type, data.level);

  const isSelected = selectedEntityId === data.id;

  // Find target for visualization
  let targetPos: THREE.Vector3 | null = null;
  let minDist = stats.range;

  for (const e of enemies) {
    const d = data.position.distanceTo(e.position);
    if (d <= minDist) {
      minDist = d;
      // Calculate local position relative to tower for the line end point
      targetPos = e.position.clone().sub(data.position);
    }
  }

  return (
    <group
      position={data.position}
      onClick={(e) => {
        e.stopPropagation();
        // Only select for upgrade if we aren't currently trying to build something
        if (!selectedTower) {
          setSelectedEntityId(data.id);
        }
      }}
    >
      {/* Selection Ring */}
      {isSelected && (
        <Ring args={[0.8, 0.9, 32]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </Ring>
      )}

      {/* Range Indicator (only when selected) */}
      {isSelected && (
        <Ring
          args={[stats.range - 0.05, stats.range, 64]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.1, 0]}
        >
          <meshBasicMaterial color={config.color} transparent opacity={0.2} />
        </Ring>
      )}

      {/* Base */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[1.5, 0.4, 1.5]} />
        <meshStandardMaterial color={isSelected ? '#666' : '#444'} />
      </mesh>

      {/* Level Indicators */}
      {[...Array(data.level)].map((_, i) => (
        <mesh key={i} position={[0.6, 0.5 + i * 0.15, 0.6]}>
          <boxGeometry args={[0.2, 0.1, 0.2]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      ))}

      {/* Turret */}
      <mesh
        castShadow
        position={[0, 1, 0]}
        scale={[1 + (data.level - 1) * 0.1, 1 + (data.level - 1) * 0.1, 1 + (data.level - 1) * 0.1]}
      >
        <cylinderGeometry args={[0.4, 0.6, 1.2, 8]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={0.6}
        />
      </mesh>

      {targetPos && (
        <Line
          points={[new THREE.Vector3(0, 1, 0), targetPos]}
          color={config.color}
          lineWidth={1}
          opacity={0.3}
          transparent
        />
      )}
    </group>
  );
};

const Projectile: React.FC<{ data: ProjectileEntity; enemies: EnemyEntity[] }> = ({
  data,
  enemies,
}) => {
  const target = enemies.find((e) => e.id === data.targetId);
  if (!target) return null;

  // Interpolate visual position
  const start = data.startPos;
  const end = target.position;

  // Simple lerp based on progress
  const x = start.x + (end.x - start.x) * data.progress;
  const y = start.y + (end.y - start.y) * data.progress;
  const z = start.z + (end.z - start.z) * data.progress;

  return (
    <group position={[x, y, z]}>
      <Trail
        width={0.4} // Width of the trail
        length={3} // Length of the trail
        color={new THREE.Color(data.color).offsetHSL(0, 0, 0.2)} // Slightly lighter trail
        attenuation={(t) => t * t} // Quadratic attenuation for a sharper tail fade
      >
        <mesh>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial color={data.color} toneMapped={false} />
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
  const particleCount = 12;

  // Memoize random directions for particles
  const particles = useMemo(() => {
    return new Array(particleCount).fill(0).map(() => ({
      dir: new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize(),
      speed: Math.random() * 5 + 2,
    }));
  }, []);

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime - data.createdAt;

    // Check if finished
    if (elapsed > data.duration) {
      remove(data.id);
      return;
    }

    if (particlesRef.current) {
      // Animate particles
      particlesRef.current.children.forEach((child, i) => {
        const p = particles[i];
        if (p && child instanceof THREE.Mesh) {
          child.position.add(p.dir.clone().multiplyScalar(p.speed * delta));
          // Shrink
          const scale = Math.max(0, 0.2 * (1 - elapsed / data.duration));
          child.scale.set(scale, scale, scale);
        }
      });
    }
  });

  return (
    <group position={data.position}>
      {/* Central Flash */}
      <mesh>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="white" transparent opacity={0.8} />
      </mesh>
      {/* Particles */}
      <group ref={particlesRef}>
        {particles.map((_, i) => (
          <mesh key={i} position={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={data.color} toneMapped={false} />
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
      {/* Ground Grid */}
      {MAP_GRID.map((row, z) =>
        row.map((type, x) => <Tile key={`${x}-${z}`} x={x} z={z} type={type} />),
      )}
    </group>
  );
};

const SceneContent = () => {
  const { enemies, towers, projectiles, effects, setEffects } = useGame();

  // Offset logic to center the map
  const offsetX = (-MAP_WIDTH * TILE_SIZE) / 2 + TILE_SIZE / 2;
  const offsetZ = (-MAP_HEIGHT * TILE_SIZE) / 2 + TILE_SIZE / 2;

  const removeEffect = (id: string) => {
    setEffects((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 20, 10]} intensity={1} castShadow />
      <directionalLight position={[-10, 20, -10]} intensity={0.5} />

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
        maxDistance={40}
      />

      {/* Effects */}
      <SoftShadows size={10} samples={8} />
    </>
  );
};

export const GameCanvas = () => {
  return (
    <div className="w-full h-full bg-[#050510]">
      <Canvas shadows camera={{ position: [0, 25, 20], fov: 45 }}>
        <SceneContent />
      </Canvas>
    </div>
  );
};
