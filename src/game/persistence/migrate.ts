import { MAP_LAYOUTS, getMapGrid } from '../../constants';
import { TileType } from '../../types';

import { knownTowerTypes, knownUpgradeKeys } from './constants';
import type { MigrateResult, Quality, SaveV1 } from './types';
import { clampMin, coerceInt, isRecord } from './utils';
import { validateSave } from './validation';

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
