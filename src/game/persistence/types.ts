import type { GraphicsQuality, TargetingMode } from '../../types';

export type Quality = GraphicsQuality;

export const CHECKPOINT_STORAGE_KEY_V1 = 'nd3d.checkpoint.v1';

export interface SaveV1 {
  schemaVersion: 1;
  timestamp: string; // ISO
  settings?: { quality?: Quality };
  ui: {
    currentMapIndex: number;
    gameMode?: 'CLASSIC' | 'ROGUELITE';
    roguePhase?: number;
    customMapSeed?: string | null;
    customMapLayout?: number[][] | null;
    money: number;
    lives: number;
    totalEarned: number;
    totalSpent: number;
    totalDamageDealt?: number;
    totalCurrencyEarned?: number;
    researchPoints: number;
    upgrades: Record<string, number>;
  };
  checkpoint: {
    waveToStart: number;
    towers: Array<{
      type: string;
      targetingMode?: TargetingMode;
      level: number;
      x: number;
      z: number;
    }>;
  };
}

export interface MigrateResult {
  ok: boolean;
  save?: SaveV1;
  warnings: string[];
  errors?: string[];
}
