import { createInitialEngineState, allocateId, applyEnginePatch } from '../engine/state';
import type { EngineState } from '../engine/types';
import type { UiState } from '../engine/uiReducer';
import { createInitialWaveState } from '../engine/wave';
import { calculateSynergies } from '../synergies';

import { knownUpgradeKeys } from './constants';
import type { SaveV1 } from './types';
import { clampMin, coerceInt } from './utils';

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

  const synergies = calculateSynergies(engine.towers);
  const synergedTowers = engine.towers.map((t) => ({
    ...t,
    activeSynergies: synergies.get(t.id),
  }));

  engine = applyEnginePatch(engine, { towers: synergedTowers });

  return { engine, ui: nextUi };
};
