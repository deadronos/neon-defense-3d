import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

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

  it('calls onClose and onSell', async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole('button', { name: /sell unit/i }));
    expect(onSell).toHaveBeenCalledWith('tower-1');
  });

  it('disables Upgrade when unaffordable and enables it when affordable', async () => {
    const user = userEvent.setup();
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
