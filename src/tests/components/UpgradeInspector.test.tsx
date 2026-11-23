import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';

import { UpgradeInspector } from '../../components/ui/UpgradeInspector';
import { useGame } from '../../game/gameContexts';
import { GameProvider } from '../../game/GameState';
import { createInitialRuntimeState, runtimeReducer } from '../../game/stores/runtimeReducer';
import { calculateTowerRefundValue } from '../../game/utils';
import { TowerType } from '../../types';

vi.mock('../../game/audio/useAudio', () => ({
  useAudio: () => ({ playSFX: vi.fn() }),
}));

const baseTower = {
  id: 'tower-1',
  type: TowerType.Basic,
  gridPos: [0, 0] as [number, number],
  position: [0, 0.5, 0] as const,
  lastFired: 0,
  targetId: null,
  level: 1,
};

describe('UpgradeInspector', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [TowerType.Sniper, 1, '+0.02/s'],
    [TowerType.Missile, 1, '+0.03/s'],
    [TowerType.Basic, 5, '+0.1/s'],
    [TowerType.Rapid, 11, 'MAX'],
  ])('shows the rate upgrade for %s at level %i', (type, level, label) => {
    render(
      <UpgradeInspector
        selectedTowerEntity={{ ...baseTower, type, level }}
        upgrades={{}}
        money={999}
        onClose={vi.fn()}
        onUpgrade={vi.fn()}
        onSell={vi.fn()}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('defaults to First and forwards the selected priority', async () => {
    const onTargetingMode = vi.fn();
    render(
      <UpgradeInspector
        selectedTowerEntity={baseTower}
        upgrades={{}}
        money={100}
        onClose={vi.fn()}
        onUpgrade={vi.fn()}
        onSell={vi.fn()}
        onTargetingMode={onTargetingMode}
      />,
    );
    const selector = screen.getByRole('combobox', { name: 'Targeting priority' });
    expect(selector).toHaveValue('first');
    await userEvent.selectOptions(selector, 'strongest');
    expect(onTargetingMode).toHaveBeenCalledWith(baseTower.id, 'strongest');
  });

  it('calls onClose and onSell with confirmation', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    const onUpgrade = vi.fn();
    const onSell = vi.fn();

    render(
      <UpgradeInspector
        selectedTowerEntity={baseTower}
        upgrades={{}}
        money={999}
        onClose={onClose}
        onUpgrade={onUpgrade}
        onSell={onSell}
      />,
    );

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Initial state: "Sell Unit"
    const sellBtn = screen.getByRole('button', { name: /sell unit/i });
    expect(sellBtn).toHaveTextContent(/sell unit/i);

    // First click: triggers confirmation
    await user.click(sellBtn);
    expect(onSell).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /confirm sell/i })).toBeInTheDocument();

    // Second click: actually sells
    await user.click(screen.getByRole('button', { name: /confirm sell/i }));
    expect(onSell).toHaveBeenCalledWith('tower-1');
  });

  it('resets confirmation after timeout', () => {
    vi.useFakeTimers();
    // Use standard render without userEvent to avoid async/timeout complications with fake timers

    const onClose = vi.fn();
    const onUpgrade = vi.fn();
    const onSell = vi.fn();

    render(
      <UpgradeInspector
        selectedTowerEntity={baseTower}
        upgrades={{}}
        money={999}
        onClose={onClose}
        onUpgrade={onUpgrade}
        onSell={onSell}
      />,
    );

    // Click to confirm
    const sellBtn = screen.getByRole('button', { name: /sell unit/i });

    // Use fireEvent which is synchronous
    fireEvent.click(sellBtn);

    expect(screen.getByText('Confirm Sell?')).toBeInTheDocument();

    // Fast forward 3 seconds + buffer
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    // Should revert
    expect(screen.getByText(/Sell Unit/)).toBeInTheDocument();
  });

  it('resets confirmation when tower changes', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    const onUpgrade = vi.fn();
    const onSell = vi.fn();

    const { rerender } = render(
      <UpgradeInspector
        selectedTowerEntity={baseTower}
        upgrades={{}}
        money={999}
        onClose={onClose}
        onUpgrade={onUpgrade}
        onSell={onSell}
      />,
    );

    // Click to confirm
    await user.click(screen.getByRole('button', { name: /sell unit/i }));
    expect(screen.getByText('Confirm Sell?')).toBeInTheDocument();

    // Change selected tower
    const otherTower = { ...baseTower, id: 'tower-2' };
    rerender(
      <UpgradeInspector
        selectedTowerEntity={otherTower}
        upgrades={{}}
        money={999}
        onClose={onClose}
        onUpgrade={onUpgrade}
        onSell={onSell}
      />,
    );

    // Should revert
    expect(screen.getByText(/Sell Unit/)).toBeInTheDocument();
  });

  it('shows a pro-rated sell refund based on tower investment', () => {
    const upgradedTower = { ...baseTower, level: 2 };
    const refund = calculateTowerRefundValue(TowerType.Basic, upgradedTower.level);

    render(
      <UpgradeInspector
        selectedTowerEntity={upgradedTower}
        upgrades={{}}
        money={999}
        onClose={vi.fn()}
        onUpgrade={vi.fn()}
        onSell={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /sell unit/i })).toHaveTextContent(
      `Sell Unit (+$${refund})`,
    );
  });
});

it.each([1, 2, 3, 4, 5])('matches the runtime upgrade charge at level %i', async (level) => {
  const user = userEvent.setup({ delay: null });
  const onClose = vi.fn();
  const onUpgrade = vi.fn();
  const onSell = vi.fn();

  const tower = { ...baseTower, level };
  const initial = createInitialRuntimeState();
  const before = {
    engine: {
      ...initial.engine,
      towers: [{ ...tower, gridPosition: tower.gridPos, targetId: undefined }],
    },
    ui: { ...initial.ui, money: 1000 },
  };
  const after = runtimeReducer(before, { type: 'upgradeTower', id: tower.id });
  expect(after.engine.towers[0].level).toBe(level + 1);
  const cost = before.ui.money - after.ui.money;

  const { rerender } = render(
    <UpgradeInspector
      selectedTowerEntity={tower}
      upgrades={{}}
      money={cost - 1}
      onClose={onClose}
      onUpgrade={onUpgrade}
      onSell={onSell}
    />,
  );

  const upgradeBtn = screen.getByRole('button', { name: /upgrade/i });
  expect(upgradeBtn).toBeDisabled();
  expect(screen.getByText(`$${cost}`)).toBeInTheDocument();

  rerender(
    <UpgradeInspector
      selectedTowerEntity={tower}
      upgrades={{}}
      money={cost}
      onClose={onClose}
      onUpgrade={onUpgrade}
      onSell={onSell}
    />,
  );

  expect(upgradeBtn).not.toBeDisabled();

  await user.click(upgradeBtn);
  expect(onUpgrade).toHaveBeenCalledWith('tower-1');
});

function ProviderInspector() {
  const game = useGame();
  const tower = game.towers.at(0);
  return (
    <>
      <button
        onClick={() => {
          game.startGame();
          game.placeTower(0, 0, TowerType.Basic);
        }}
      >
        Place test tower
      </button>
      <output aria-label="Balance">{game.gameState.money}</output>
      {tower && (
        <>
          <output aria-label="Tower level">{tower.level}</output>
          <UpgradeInspector
            selectedTowerEntity={tower}
            upgrades={game.gameState.upgrades}
            money={game.gameState.money}
            onClose={() => {}}
            onUpgrade={game.upgradeTower}
            onTargetingMode={game.setTowerTargetingMode}
            onSell={game.sellTower}
          />
        </>
      )}
    </>
  );
}

it('persists targeting priority and deducts the displayed upgrade cost through GameProvider', async () => {
  const user = userEvent.setup();
  render(<ProviderInspector />, { wrapper: GameProvider });
  await user.click(screen.getByRole('button', { name: 'Place test tower' }));

  const targeting = screen.getByRole('combobox', { name: 'Targeting priority' });
  expect(targeting).toHaveValue('first');
  await user.selectOptions(targeting, 'strongest');
  expect(targeting).toHaveValue('strongest');

  const balance = screen.getByRole('status', { name: 'Balance' });
  const before = Number(balance.textContent);
  const upgrade = screen.getByRole('button', { name: /upgrade/i });
  const displayedCost = Number(upgrade.textContent.match(/\$(\d+)/)?.[1]);
  expect(displayedCost).toBeGreaterThan(0);
  await user.click(upgrade);

  expect(screen.getByRole('status', { name: 'Tower level' })).toHaveTextContent('2');
  expect(Number(balance.textContent)).toBe(before - displayedCost);
  expect(targeting).toHaveValue('strongest');
});
