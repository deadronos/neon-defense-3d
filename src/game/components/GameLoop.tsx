import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  TILE_SIZE,
  TOWER_CONFIGS,
  PATH_WAYPOINTS,
} from '../../constants';
import type { TowerType, EnemyEntity, ProjectileEntity, EffectEntity } from '../../types';
import { useGame } from '../GameState';
import { getTowerStats } from '../utils';

/**
 * Component that hooks into the render loop to handle game logic updates.
 */
export const GameLoopBridge = () => {
  const {
    gameState,
    enemies,
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
