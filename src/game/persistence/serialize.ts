import type { EngineState } from '../engine/types';
import type { UiState } from '../engine/uiReducer';
import type { SaveV1 } from './types';
import { clampMin, coerceInt } from './utils';

export const serializeCheckpoint = (ui: UiState, engine: EngineState): SaveV1 => {
  const towers = engine.towers.map((t) => ({
    type: t.type,
    level: t.level,
    x: t.gridPosition[0],
    z: t.gridPosition[1],
  }));

  // We store a "waveToStart" intended for restoring back to a clean "preparing" state.
  const waveToStart = clampMin(coerceInt(ui.wave, 1), 1);

  // totalSpent isn't tracked explicitly today; store 0 to keep schema stable.
  const totalEarned = coerceInt(ui.totalCurrencyEarned, 0);

  return {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    settings: { quality: ui.graphicsQuality },
    ui: {
      currentMapIndex: ui.currentMapIndex,
      money: clampMin(coerceInt(ui.money, 150), 0),
      lives: clampMin(coerceInt(ui.lives, 20), 0),
      totalEarned,
      totalSpent: 0,
      totalDamageDealt: clampMin(coerceInt(ui.totalDamageDealt, 0), 0),
      totalCurrencyEarned: totalEarned,
      researchPoints: clampMin(coerceInt(ui.researchPoints, 0), 0),
      upgrades: Object.fromEntries(
        Object.entries(ui.upgrades ?? {}).map(([k, v]) => [k, clampMin(coerceInt(v, 0), 0)]),
      ),
    },
    checkpoint: {
      waveToStart,
      towers,
    },
  };
};
