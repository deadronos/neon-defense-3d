import { useState } from 'react';
import type { EnemyEntity, ProjectileEntity, EffectEntity } from '../../types';

/**
 * Hook to manage the state of game entities (enemies, projectiles, effects).
 * @returns An object containing entity lists and their state setters.
 */
export const useEntityState = () => {
  const [enemies, setEnemies] = useState<EnemyEntity[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileEntity[]>([]);
  const [effects, setEffects] = useState<EffectEntity[]>([]);

  return {
    enemies,
    setEnemies,
    projectiles,
    setProjectiles,
    effects,
    setEffects,
  };
};
