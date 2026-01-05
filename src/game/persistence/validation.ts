import { isRecord } from './utils';

const validateUi = (ui: Record<string, unknown>, errors: string[]) => {
  const currentMapIndex = ui.currentMapIndex;
  if (!Number.isInteger(currentMapIndex) || currentMapIndex < 0) {
    errors.push('ui.currentMapIndex must be an integer >= 0.');
  }

  const money = ui.money;
  if (!Number.isInteger(money) || money < 0) {
    errors.push('ui.money must be >= 0.');
  }

  const lives = ui.lives;
  if (!Number.isInteger(lives) || lives < 0) {
    errors.push('ui.lives must be >= 0.');
  }

  const totalEarned = ui.totalEarned;
  if (!Number.isInteger(totalEarned) || totalEarned < 0) {
    errors.push('ui.totalEarned must be >= 0.');
  }

  const totalSpent = ui.totalSpent;
  if (!Number.isInteger(totalSpent) || totalSpent < 0) {
    errors.push('ui.totalSpent must be >= 0.');
  }

  const researchPoints = ui.researchPoints;
  if (!Number.isInteger(researchPoints) || researchPoints < 0) {
    errors.push('ui.researchPoints must be >= 0.');
  }

  if (!isRecord(ui.upgrades)) errors.push('ui.upgrades must be an object.');
};

const validateCheckpoint = (checkpoint: Record<string, unknown>, errors: string[]) => {
  const waveToStart = checkpoint.waveToStart;
  if (!Number.isInteger(waveToStart) || waveToStart < 1) {
    errors.push('checkpoint.waveToStart must be an integer >= 1.');
  }

  if (!Array.isArray(checkpoint.towers)) errors.push('checkpoint.towers must be an array.');
};

export const validateSave = (save: unknown): { ok: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!isRecord(save)) return { ok: false, errors: ['Save must be an object.'] };

  if (save.schemaVersion !== 1) errors.push('Unsupported schemaVersion.');
  if (typeof save.timestamp !== 'string') errors.push('Missing timestamp.');

  const ui = save.ui;
  if (!isRecord(ui)) errors.push('Missing ui section.');
  else validateUi(ui, errors);

  const checkpoint = save.checkpoint;
  if (!isRecord(checkpoint)) errors.push('Missing checkpoint section.');
  else validateCheckpoint(checkpoint, errors);

  return { ok: errors.length === 0, errors };
};
