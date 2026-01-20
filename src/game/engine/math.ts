import type { EngineVector3 } from './types';

export const distanceSquared = (a: EngineVector3, b: EngineVector3): number =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
