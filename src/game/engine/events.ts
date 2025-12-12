export type EngineEvent =
  | { type: 'MoneyAwarded'; amount: number; reason?: string }
  | { type: 'LivesLost'; amount: number; source?: string }
  | { type: 'EnemyKilled'; enemyId: string; reward: number }
  | { type: 'WaveStarted'; wave: number }
  | { type: 'EffectSpawned'; effectId: string };

export const mergeEvents = (...sets: EngineEvent[][]): EngineEvent[] => sets.flat();
