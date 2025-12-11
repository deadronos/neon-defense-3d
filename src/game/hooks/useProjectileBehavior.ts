import { useCallback } from 'react';
import type {
  ProjectileEntity,
  EnemyEntity,
  EffectEntity,
  GameState,
} from '../../types';

/**
 * Hook to manage projectile movement and collision logic.
 * @returns An update function to be called in the game loop.
 */
export const useProjectileBehavior = () => {
  /**
   * Updates projectile positions and handles collisions with enemies.
   *
   * @param projectiles - List of active projectiles.
   * @param enemies - List of active enemies.
   * @param delta - Time delta.
   * @param currentTime - Current elapsed time (for effects).
   * @param setEnemies - State setter for enemies (to apply damage).
   * @param setGameState - State setter for game state (to award money).
   * @param setEffects - State setter for effects (to add explosions).
   * @returns The updated list of projectiles (removing those that hit).
   */
  const updateProjectiles = useCallback(
    (
      projectiles: ProjectileEntity[],
      enemies: EnemyEntity[],
      delta: number,
      currentTime: number,
      setEnemies: React.Dispatch<React.SetStateAction<EnemyEntity[]>>,
      setGameState: React.Dispatch<React.SetStateAction<GameState>>,
      setEffects: React.Dispatch<React.SetStateAction<EffectEntity[]>>,
      greedMultiplier: number = 1
    ): ProjectileEntity[] => {
      const hits: Record<string, number> = {};
      let frameTotalDamage = 0;

      const activeProjectiles = projectiles
        .map((p) => {
          const newP = { ...p } as any;
          const t = enemies.find((e) => e.id === newP.targetId);
          if (!t) return null;

          newP.progress += delta * 3;
          if (newP.progress >= 1) {
            hits[newP.targetId] = (hits[newP.targetId] || 0) + newP.damage;
            frameTotalDamage += newP.damage;
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
                moneyGained += Math.floor(e.config.reward * greedMultiplier);
                newEffects.push({
                  id: Math.random().toString(),
                  type: 'explosion',
                  position: e.position.clone(),
                  color: e.config.color,
                  scale: e.config.scale || 0.4,
                  createdAt: currentTime,
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

          if (moneyGained > 0 || newEffects.length > 0 || frameTotalDamage > 0) {
            setTimeout(() => {
              if (moneyGained > 0 || frameTotalDamage > 0)
                setGameState((g) => ({
                   ...g,
                   money: g.money + moneyGained,
                   totalCurrencyEarned: (g.totalCurrencyEarned || 0) + moneyGained,
                   totalDamageDealt: (g.totalDamageDealt || 0) + frameTotalDamage
                }));
              if (newEffects.length > 0)
                setEffects((prev) => [...prev, ...newEffects]);
            }, 0);
          }
          return nextEnemies;
        });
      }

      return activeProjectiles;
    },
    []
  );

  return { updateProjectiles };
};
