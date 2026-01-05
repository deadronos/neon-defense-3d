import type { SaveV1 } from './types';
import { isRecord } from './utils';

export const validateSave = (save: SaveV1): { ok: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (save.schemaVersion !== 1) errors.push('Unsupported schemaVersion.');
  if (!save.timestamp || typeof save.timestamp !== 'string') errors.push('Missing timestamp.');

  if (!save.ui) errors.push('Missing ui section.');
  if (!save.checkpoint) errors.push('Missing checkpoint section.');

  if (save.ui) {
    if (!Number.isInteger(save.ui.currentMapIndex) || save.ui.currentMapIndex < 0)
      errors.push('ui.currentMapIndex must be an integer >= 0.');
    if (!Number.isInteger(save.ui.money) || save.ui.money < 0)
      errors.push('ui.money must be >= 0.');
    if (!Number.isInteger(save.ui.lives) || save.ui.lives < 0)
      errors.push('ui.lives must be >= 0.');
    if (!Number.isInteger(save.ui.totalEarned) || save.ui.totalEarned < 0)
      errors.push('ui.totalEarned must be >= 0.');
    if (!Number.isInteger(save.ui.totalSpent) || save.ui.totalSpent < 0)
      errors.push('ui.totalSpent must be >= 0.');
    if (!Number.isInteger(save.ui.researchPoints) || save.ui.researchPoints < 0)
      errors.push('ui.researchPoints must be >= 0.');
    if (!isRecord(save.ui.upgrades)) errors.push('ui.upgrades must be an object.');
  }

  if (save.checkpoint) {
    if (!Number.isInteger(save.checkpoint.waveToStart) || save.checkpoint.waveToStart < 1)
      errors.push('checkpoint.waveToStart must be an integer >= 1.');
    if (!Array.isArray(save.checkpoint.towers)) errors.push('checkpoint.towers must be an array.');
  }

  return { ok: errors.length === 0, errors };
};
