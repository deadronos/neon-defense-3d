import { describe, expect, it } from 'vitest';

import { uiReducer, createInitialUiState } from '../../../game/engine/uiReducer';
import { UpgradeType } from '../../../types';

describe('engine uiReducer', () => {
  it('startGame initializes session values', () => {
    const initial = createInitialUiState();
    const next = uiReducer(initial, { type: 'startGame' });
    expect(next.gameStatus).toBe('playing');
    expect(next.isPlaying).toBe(true);
    expect(next.money).toBe(150);
    expect(next.lives).toBe(20);
    expect(next.wave).toBe(1);
    expect(next.upgrades).toEqual({});
  });

  it('purchaseUpgrade spends RP and increments level', () => {
    const initial = { ...createInitialUiState(), researchPoints: 5 };
    const next = uiReducer(initial, {
      type: 'purchaseUpgrade',
      upgrade: UpgradeType.GLOBAL_DAMAGE,
      cost: 2,
    });
    expect(next.researchPoints).toBe(3);
    expect(next.upgrades[UpgradeType.GLOBAL_DAMAGE]).toBe(1);
  });

  it('WaveCompleted triggers victory every 10 waves and awards RP', () => {
    const playing = {
      ...createInitialUiState(),
      gameStatus: 'playing' as const,
      isPlaying: true,
      totalDamageDealt: 400,
      totalCurrencyEarned: 200,
      researchPoints: 0,
    };

    const next = uiReducer(playing, {
      type: 'applyEngineEvents',
      events: [{ type: 'WaveCompleted', wave: 10 }],
    });

    expect(next.gameStatus).toBe('victory');
    expect(next.isPlaying).toBe(false);
    expect(next.researchPoints).toBe(4); // floor(400/200 + 200/100)
  });
});
