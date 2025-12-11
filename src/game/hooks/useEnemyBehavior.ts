import { useCallback } from 'react';
import * as THREE from 'three';
import { TILE_SIZE } from '../../constants';
import type { EnemyEntity, GameState, Vector2 } from '../../types';

/**
 * Hook to manage enemy movement logic and life deduction.
 * @returns An update function to be called in the game loop.
 */
export const useEnemyBehavior = () => {
  /**
   * Updates enemy positions and progress along the path.
   * Deducts lives if enemies reach the end of the path.
   *
   * @param enemies - List of current enemies.
   * @param delta - Time delta.
   * @param setGameState - State setter for game state (to deduct lives).
   * @param pathWaypoints - The current path waypoints.
   * @returns The updated list of enemies.
   */
  const updateEnemies = useCallback(
    (
      enemies: EnemyEntity[],
      delta: number,
      setGameState: React.Dispatch<React.SetStateAction<GameState>>,
      pathWaypoints: Vector2[],
    ): EnemyEntity[] => {
      let hpLoss = 0;
      const nextEnemies = enemies
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

          const p1 = pathWaypoints[newEnemy.pathIndex];
          const p2 = pathWaypoints[newEnemy.pathIndex + 1];

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
            if (newEnemy.pathIndex >= pathWaypoints.length - 1) {
              hpLoss++;
              return null;
            }
          }

          const pp1 = pathWaypoints[newEnemy.pathIndex];
          const pp2 = pathWaypoints[newEnemy.pathIndex + 1] || pp1;
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

      return nextEnemies;
    },
    [],
  );

  return { updateEnemies };
};
