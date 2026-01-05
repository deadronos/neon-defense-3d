import { migrateSave } from './migrate';
import type { SaveV1 } from './types';
import { CHECKPOINT_STORAGE_KEY_V1 } from './types';

export const saveCheckpoint = (save: SaveV1): { ok: boolean; error?: string } => {
  try {
    const json = JSON.stringify(save);
    localStorage.setItem(CHECKPOINT_STORAGE_KEY_V1, json);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
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
  } catch (e) {
    console.warn('[PERSISTENCE] Failed to load checkpoint, returning null:', e);
    return null;
  }
};

export const clearCheckpoint = (): void => {
  try {
    localStorage.removeItem(CHECKPOINT_STORAGE_KEY_V1);
  } catch (e) {
    console.warn('[PERSISTENCE] Failed to clear checkpoint:', e);
  }
};
