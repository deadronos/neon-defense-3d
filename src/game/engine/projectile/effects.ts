import type { EngineEffectIntent, EngineVector3 } from '../types';

export const createExplosionEffect = (
  effectCounter: number,
  position: EngineVector3,
  color: string | undefined,
  scale: number,
  createdAt: number,
  duration: number,
): { effect: EngineEffectIntent; newCounter: number } => {
  const newCounter = effectCounter + 1;
  const effect: EngineEffectIntent = {
    id: `effect-${newCounter}`,
    type: 'explosion',
    position,
    color,
    scale,
    createdAt,
    duration,
  };
  return { effect, newCounter };
};
