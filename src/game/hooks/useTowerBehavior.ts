import { useCallback } from 'react';
import * as THREE from 'three';

import { TOWER_CONFIGS } from '../../constants';
import type { TowerEntity, EnemyEntity, ProjectileEntity, TowerType } from '../../types';
import { getTowerStats } from '../utils';

/**
 * Hook to manage tower firing logic.
 * @returns An update function to be called in the game loop.
 */
export const useTowerBehavior = () => {
  /**
   * Updates towers, checks for targets, and creates new projectiles.
   *
   * @param towers - List of current towers.
   * @param enemies - List of current enemies to target.
   * @param now - Current game time (elapsed time).
   * @param setProjectiles - State setter for projectiles.
   * @returns The updated list of towers (with updated fire timestamps).
   */
  const updateTowers = useCallback(
    (
      towers: TowerEntity[],
      enemies: EnemyEntity[],
      now: number,
      setProjectiles: React.Dispatch<React.SetStateAction<ProjectileEntity[]>>,
    ): TowerEntity[] => {
      const newProjs: ProjectileEntity[] = [];
      const updatedTowers = towers.map((t) => {
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
          const proj: ProjectileEntity = {
            id: Math.random().toString(),
            startPos: t.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
            targetId: target.id,
            speed: 20,
            progress: 0,
            damage: stats.damage,
            color: TOWER_CONFIGS[t.type as TowerType].color,
          };
          newProjs.push(proj);
          return { ...t, lastFired: now, targetId: target.id };
        }
        return t;
      });

      if (newProjs.length) {
        setProjectiles((p) => [...p, ...newProjs]);
      }
      return updatedTowers;
    },
    [],
  );

  return { updateTowers };
};
