import { describe, expect, it } from 'vitest';

import { uiReducer, createInitialUiState } from '../../../game/engine/uiReducer';
import { TowerType, UpgradeType } from '../../../types';

describe('engine uiReducer', () => {
  it('startGame initializes session values', () => {
    const initial = createInitialUiState();
    const next = uiReducer(initial, { type: 'startGame' });
    expect(next.gameStatus).toBe('playing');
    expect(next.money).toBe(150);
    expect(next.lives).toBe(20);
    expect(next.wave).toBe(1);
    expect(next.upgrades).toEqual({});
  });

  it('resetGame returns to idle baseline values', () => {
    const playing = uiReducer(createInitialUiState(), { type: 'startGame' });
    const next = uiReducer(playing, { type: 'resetGame' });
    expect(next.gameStatus).toBe('idle');
    expect(next.money).toBe(150);
    expect(next.lives).toBe(20);
    expect(next.wave).toBe(1);
    expect(next.currentMapIndex).toBe(0);
    expect(next.selectedEntityId).toBeNull();
    expect(next.selectedTower).toBeNull();
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

  it('purchaseUpgrade is a no-op when insufficient RP', () => {
    const initial = { ...createInitialUiState(), researchPoints: 1 };
    const next = uiReducer(initial, {
      type: 'purchaseUpgrade',
      upgrade: UpgradeType.GLOBAL_DAMAGE,
      cost: 2,
    });
    // reducer intentionally returns the same state object when no changes are made
    expect(next).toBe(initial);
  });

  it('startNextSector advances map index and applies GLOBAL_GREED start money', () => {
    const initial = {
      ...createInitialUiState(),
      gameStatus: 'victory' as const,
      currentMapIndex: 0,
      upgrades: { [UpgradeType.GLOBAL_GREED]: 2 },
      selectedEntityId: 't1',
      selectedTower: TowerType.Basic,
    };

    const next = uiReducer(initial, { type: 'startNextSector' });
    expect(next.gameStatus).toBe('playing');
    expect(next.currentMapIndex).toBe(1);
    expect(next.wave).toBe(1);
    expect(next.money).toBeCloseTo(150 * 1.1);
    expect(next.totalDamageDealt).toBe(0);
    expect(next.totalCurrencyEarned).toBe(0);
    expect(next.selectedEntityId).toBeNull();
    expect(next.selectedTower).toBeNull();
  });

  it('spendMoney clamps at 0', () => {
    const initial = { ...createInitialUiState(), money: 10 };
    const next = uiReducer(initial, { type: 'spendMoney', amount: 999 });
    expect(next.money).toBe(0);
  });

  it('setGraphicsQuality updates graphics preset', () => {
    const initial = createInitialUiState();
    const next = uiReducer(initial, { type: 'setGraphicsQuality', quality: 'low' });
    expect(next.graphicsQuality).toBe('low');
  });

  it('setSelectedTower and setSelectedEntity update selection', () => {
    const initial = createInitialUiState();
    const next1 = uiReducer(initial, { type: 'setSelectedTower', tower: TowerType.Sniper });
    expect(next1.selectedTower).toBe(TowerType.Sniper);
    const next2 = uiReducer(next1, { type: 'setSelectedEntity', id: 'tower-1' });
    expect(next2.selectedEntityId).toBe('tower-1');
  });

  it('WaveCompleted triggers victory every 10 waves and awards RP', () => {
    const playing = {
      ...createInitialUiState(),
      gameStatus: 'playing' as const,
      totalDamageDealt: 400,
      totalCurrencyEarned: 200,
      researchPoints: 0,
    };

    const next = uiReducer(playing, {
      type: 'applyEngineEvents',
      events: [{ type: 'WaveCompleted', wave: 10 }],
    });

    expect(next.gameStatus).toBe('victory');
    expect(next.researchPoints).toBe(4); // floor(400/200 + 200/100)
  });

  it('applyEngineEvents reduces events: money/lives/damage/wave/reward and non-victory WaveCompleted', () => {
    const initial = {
      ...createInitialUiState(),
      gameStatus: 'playing' as const,
      money: 0,
      lives: 5,
      wave: 1,
      totalDamageDealt: 0,
      totalCurrencyEarned: 0,
    };

    const next = uiReducer(initial, {
      type: 'applyEngineEvents',
      events: [
        { type: 'MoneyAwarded', amount: 10 },
        { type: 'DamageDealt', amount: 123 },
        { type: 'EnemyKilled', reward: 7 },
        { type: 'WaveStarted', wave: 2 },
        // not a victory wave
        { type: 'WaveCompleted', wave: 2 },
        // should clamp lives and set gameover when <= 0
        { type: 'LivesLost', amount: 10 },
      ],
    });

    expect(next.money).toBe(17);
    expect(next.totalCurrencyEarned).toBe(7);
    expect(next.totalDamageDealt).toBe(123);
    expect(next.wave).toBe(2);
    expect(next.lives).toBe(0);
    expect(next.gameStatus).toBe('gameover');
  });
});
