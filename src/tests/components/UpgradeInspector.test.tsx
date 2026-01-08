import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';

import { UpgradeInspector } from '../../components/ui/UpgradeInspector';
import { getTowerStats } from '../../game/utils';
import { TowerType } from '../../types';

describe('UpgradeInspector', () => {
  const baseTower = {
    id: 'tower-1',
    type: TowerType.Basic,
    gridPos: [0, 0] as [number, number],
    position: [0, 0.5, 0] as const,
    lastFired: 0,
    targetId: null,
    level: 1,
  };

  afterEach(() => {
    vi.useRealTimers();
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

  it('disables Upgrade when unaffordable and enables it when affordable', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    const onUpgrade = vi.fn();
    const onSell = vi.fn();

    const nextStats = getTowerStats(TowerType.Basic, baseTower.level + 1, {});

    const { rerender } = render(
      <UpgradeInspector
        selectedTowerEntity={baseTower}
        upgrades={{}}
        money={0}
        onClose={onClose}
        onUpgrade={onUpgrade}
        onSell={onSell}
      />,
    );

    const upgradeBtn = screen.getByRole('button', { name: /upgrade/i });
    expect(upgradeBtn).toBeDisabled();
    expect(screen.getByText(`$${nextStats.upgradeCost}`)).toBeInTheDocument();

    rerender(
      <UpgradeInspector
        selectedTowerEntity={baseTower}
        upgrades={{}}
        money={nextStats.upgradeCost}
        onClose={onClose}
        onUpgrade={onUpgrade}
        onSell={onSell}
      />,
    );

    const upgradeBtnEnabled = screen.getByRole('button', { name: /upgrade/i });
    expect(upgradeBtnEnabled).not.toBeDisabled();

    await user.click(upgradeBtnEnabled);
    expect(onUpgrade).toHaveBeenCalledWith('tower-1');
  });
});
