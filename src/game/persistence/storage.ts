import { migrateSave } from './migrate';
import type { SaveV1 } from './types';
import { CHECKPOINT_STORAGE_KEY_V1 } from './types';

export const saveCheckpoint = (save: SaveV1): { ok: boolean; error?: string } => {
  try {
    const json = JSON.stringify(save);
    localStorage.setItem(CHECKPOINT_STORAGE_KEY_V1, json);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const loadCheckpoint = (): SaveV1 | null => {
  try {
    const raw = localStorage.getItem(CHECKPOINT_STORAGE_KEY_V1);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const migrated = migrateSave(parsed);
    if (!migrated.ok || !migrated.save) return null;
    return migrated.save;
  } catch (err) {
    console.warn('[PERSISTENCE] Failed to load checkpoint, returning null:', err);
    return null;
  }
};

export const clearCheckpoint = (): void => {
  try {
    localStorage.removeItem(CHECKPOINT_STORAGE_KEY_V1);
  } catch (err) {
    console.warn('[PERSISTENCE] Failed to clear checkpoint:', err);
  }
};
