export type EngineEvent =
  | { type: 'MoneyAwarded'; amount: number; reason?: string }
  | { type: 'LivesLost'; amount: number; source?: string }
  | { type: 'DamageDealt'; amount: number }
  | { type: 'EnemyKilled'; enemyId: string; reward: number }
  | { type: 'WaveStarted'; wave: number }
  | { type: 'WaveCompleted'; wave: number }
  | { type: 'EffectSpawned'; effectId: string }
  | { type: 'ProjectileFired'; projectileId: string; towerId: string };

export const mergeEvents = (...sets: EngineEvent[][]): EngineEvent[] => sets.flat();
