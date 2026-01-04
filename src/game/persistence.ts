import { MAP_LAYOUTS, getMapGrid } from '../constants';
import { TileType, TowerType, UpgradeType } from '../types';
import type { GraphicsQuality } from '../types';

import { createInitialEngineState, allocateId, applyEnginePatch } from './engine/state';
import type { EngineState } from './engine/types';
import type { UiState } from './engine/uiReducer';
import { createInitialWaveState } from './engine/wave';

export type Quality = GraphicsQuality;

export const CHECKPOINT_STORAGE_KEY_V1 = 'nd3d.checkpoint.v1';

export interface SaveV1 {
  schemaVersion: 1;
  timestamp: string; // ISO
  settings?: { quality?: Quality };
  ui: {
    currentMapIndex: number;
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
    towers: Array<{ type: string; level: number; x: number; z: number }>;
  };
}

export interface MigrateResult {
  ok: boolean;
  save?: SaveV1;
  warnings: string[];
  errors?: string[];
}

const coerceInt = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return fallback;
};

const clampMin = (n: number, min: number): number => (n < min ? min : n);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeMapIndex = (value: number, warnings: string[]): number => {
  const mapsCount = MAP_LAYOUTS.length;
  if (mapsCount <= 0) return 0;

  if (value < 0) {
    warnings.push('ui.currentMapIndex was negative; clamped to 0.');
    return 0;
  }

  if (value >= mapsCount) {
    const normalized = value % mapsCount;
    warnings.push(`ui.currentMapIndex out of range; normalized to ${normalized}.`);
    return normalized;
  }

  return value;
};

const getBuildableGridForMapIndex = (mapIndex: number) => {
  const layout = MAP_LAYOUTS[mapIndex % MAP_LAYOUTS.length];
  return getMapGrid(layout);
};

const isBuildable = (grid: TileType[][], x: number, z: number): boolean => {
  if (z < 0 || z >= grid.length) return false;
  if (x < 0 || x >= grid[0].length) return false;
  return grid[z][x] === TileType.Grass;
};

const knownTowerTypes = new Set<string>(Object.values(TowerType));
const knownUpgradeKeys = new Set<string>(Object.values(UpgradeType));

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

  const save: SaveV1 = {
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

  return save;
};

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

export const migrateSave = (input: unknown): MigrateResult => {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, warnings, errors: ['Save payload must be an object.'] };
  }

  const schemaVersion = coerceInt(input.schemaVersion, 1);
  if (schemaVersion !== 1) {
    warnings.push('Unknown or missing schemaVersion; attempting v1 migration.');
  }

  const settingsIn = isRecord(input.settings) ? input.settings : undefined;
  const qualityRaw = settingsIn?.quality;
  const quality: Quality | undefined =
    qualityRaw === 'high' || qualityRaw === 'low' ? qualityRaw : undefined;
  if (settingsIn?.quality !== undefined && quality === undefined) {
    warnings.push('settings.quality was invalid and was dropped.');
  }

  const uiIn = isRecord(input.ui) ? input.ui : undefined;
  if (!uiIn) errors.push('Missing ui section.');

  const checkpointIn = isRecord(input.checkpoint) ? input.checkpoint : undefined;
  if (!checkpointIn) errors.push('Missing checkpoint section.');

  const currentMapIndexRaw = coerceInt(uiIn?.currentMapIndex, 0);
  const currentMapIndex = normalizeMapIndex(currentMapIndexRaw, warnings);

  const grid = getBuildableGridForMapIndex(currentMapIndex);

  const money = clampMin(coerceInt(uiIn?.money, 150), 0);
  const lives = clampMin(coerceInt(uiIn?.lives, 20), 0);
  const totalEarned = clampMin(coerceInt(uiIn?.totalEarned ?? uiIn?.totalCurrencyEarned, 0), 0);
  const totalSpent = clampMin(coerceInt(uiIn?.totalSpent, 0), 0);
  const totalDamageDealt = clampMin(coerceInt(uiIn?.totalDamageDealt, 0), 0);
  const totalCurrencyEarned = clampMin(
    coerceInt(uiIn?.totalCurrencyEarned ?? uiIn?.totalEarned, 0),
    0,
  );
  const researchPoints = clampMin(coerceInt(uiIn?.researchPoints, 0), 0);

  const upgradesOut: Record<string, number> = {};
  const upgradesIn = uiIn?.upgrades;
  if (upgradesIn !== undefined && !isRecord(upgradesIn)) {
    warnings.push('ui.upgrades was not an object; replaced with empty upgrades.');
  }
  if (isRecord(upgradesIn)) {
    for (const [key, raw] of Object.entries(upgradesIn)) {
      if (!knownUpgradeKeys.has(key)) {
        warnings.push(`Unknown upgrade key '${key}' was dropped.`);
        continue;
      }
      const value = clampMin(coerceInt(raw, 0), 0);
      upgradesOut[key] = value;
    }
  }

  const waveToStart = clampMin(coerceInt(checkpointIn?.waveToStart, 1), 1);
  if (checkpointIn?.waveToStart !== undefined && waveToStart !== checkpointIn?.waveToStart) {
    warnings.push('checkpoint.waveToStart was invalid; coerced to a safe value.');
  }

  const towersIn = checkpointIn?.towers;
  if (towersIn !== undefined && !Array.isArray(towersIn)) {
    errors.push('checkpoint.towers must be an array.');
  }

  const towersOut: SaveV1['checkpoint']['towers'] = [];
  const occupied = new Set<string>();

  if (Array.isArray(towersIn)) {
    for (const [index, towerRaw] of towersIn.entries()) {
      if (!isRecord(towerRaw)) {
        warnings.push(`checkpoint.towers[${index}] was not an object and was dropped.`);
        continue;
      }

      const type = typeof towerRaw.type === 'string' ? towerRaw.type : '';
      if (!knownTowerTypes.has(type)) {
        warnings.push(`Unknown tower type '${String(towerRaw.type)}' was dropped.`);
        continue;
      }

      const x = coerceInt(towerRaw.x, -1);
      const z = coerceInt(towerRaw.z, -1);
      const level = clampMin(coerceInt(towerRaw.level, 1), 1);

      if (!isBuildable(grid, x, z)) {
        warnings.push(
          `Tower '${type}' at (${x},${z}) was out-of-bounds or unbuildable and was dropped.`,
        );
        continue;
      }

      const key = `${x},${z}`;
      if (occupied.has(key)) {
        warnings.push(`Duplicate tower position (${x},${z}) was dropped.`);
        continue;
      }

      occupied.add(key);
      towersOut.push({ type, level, x, z });
    }
  }

  if (errors.length > 0) return { ok: false, warnings, errors };

  const save: SaveV1 = {
    schemaVersion: 1,
    timestamp: typeof input.timestamp === 'string' ? input.timestamp : new Date().toISOString(),
    settings: quality ? { quality } : undefined,
    ui: {
      currentMapIndex,
      money,
      lives,
      totalEarned,
      totalSpent,
      totalDamageDealt,
      totalCurrencyEarned,
      researchPoints,
      upgrades: upgradesOut,
    },
    checkpoint: {
      waveToStart,
      towers: towersOut,
    },
  };

  const validation = validateSave(save);
  if (!validation.ok) return { ok: false, warnings, errors: validation.errors };

  return { ok: true, warnings, save };
};

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

export const buildRuntimeFromCheckpoint = (
  save: SaveV1,
  previousUi: UiState,
): { engine: EngineState; ui: UiState } => {
  const nextUi: UiState = {
    ...previousUi,
    gameStatus: 'playing',
    currentMapIndex: save.ui.currentMapIndex,
    money: save.ui.money,
    lives: save.ui.lives,
    wave: save.checkpoint.waveToStart,
    waveStartedNonce: 0,
    lastWaveStartedWave: 0,
    researchPoints: save.ui.researchPoints,
    totalDamageDealt: clampMin(coerceInt(save.ui.totalDamageDealt, 0), 0),
    totalCurrencyEarned: clampMin(
      coerceInt(save.ui.totalCurrencyEarned ?? save.ui.totalEarned, 0),
      0,
    ),
    upgrades: Object.fromEntries(
      Object.entries(save.ui.upgrades ?? {}).filter(([k]) => knownUpgradeKeys.has(k)),
    ) as UiState['upgrades'],
    selectedEntityId: null,
    selectedTower: null,
    // Increment session nonce to force a full scene remount
    sessionNonce: (previousUi.sessionNonce || 0) + 1,
  };

  if (save.settings?.quality) {
    nextUi.graphicsQuality = save.settings.quality;
  }

  // Rebuild engine state: Tier-B checkpoint intentionally excludes ephemeral simulation state.
  let engine = createInitialEngineState();

  // Prepare so that the NEXT WaveStarted emitted by the engine is save.checkpoint.waveToStart.
  const prep = createInitialWaveState();
  const preparingWave = {
    ...prep,
    wave: clampMin(save.checkpoint.waveToStart - 1, 0),
    phase: 'preparing' as const,
    enemiesRemainingToSpawn: 0,
    enemiesAlive: 0,
  };

  engine = applyEnginePatch(engine, {
    wave: preparingWave,
    enemies: [],
    projectiles: [],
    effects: [],
    pendingEvents: [],
  });

  // Recreate towers with fresh IDs.
  for (const t of save.checkpoint.towers) {
    const { id, state: afterId } = allocateId(engine, 'tower');
    engine = applyEnginePatch(afterId, {
      towers: [
        ...afterId.towers,
        {
          id,
          type: t.type,
          level: clampMin(coerceInt(t.level, 1), 1),
          gridPosition: [t.x, t.z],
          lastFired: 0,
        },
      ],
    });
  }

  return { engine, ui: nextUi };
};
