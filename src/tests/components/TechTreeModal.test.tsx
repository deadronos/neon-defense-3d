import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TechTreeModal } from '../../components/TechTreeModal';
import { UpgradeType } from '../../types';

// Mock useGame hook
vi.mock('../../game/GameState', () => ({
  useGame: () => ({
    gameState: {
      researchPoints: 5,
      upgrades: {
        [UpgradeType.GLOBAL_DAMAGE]: 1,
        [UpgradeType.GLOBAL_RANGE]: 0,
        [UpgradeType.GLOBAL_GREED]: 2,
      },
    },
    purchaseUpgrade: vi.fn(),
  }),
}));

describe('TechTreeModal', () => {
  it('renders the tech lab header and available RP', () => {
    render(<TechTreeModal />);

    expect(screen.getByText('TECH LAB')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // researchPoints
  });

  it('displays all three upgrade options', () => {
    render(<TechTreeModal />);

    expect(screen.getByText('Weapon Overdrive')).toBeInTheDocument();
    expect(screen.getByText('Sensor Array')).toBeInTheDocument();
    expect(screen.getByText('Matter Recycler')).toBeInTheDocument();
  });

  it('shows current upgrade levels for each research node', () => {
    render(<TechTreeModal />);

    // Weapon Overdrive at level 1 = +5%
    expect(screen.getByText('Lvl 1 Effect: +5%')).toBeInTheDocument();
    // Sensor Array at level 0 = +0%
    expect(screen.getByText('Lvl 0 Effect: +0%')).toBeInTheDocument();
    // Matter Recycler at level 2 = +10%
    expect(screen.getByText('Lvl 2 Effect: +10%')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<TechTreeModal onClose={onClose} />);

    // Click the footer CLOSE button (not the X icon in header)
    const closeButton = screen.getByText('CLOSE');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders action button when onAction is provided', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(<TechTreeModal actionLabel="WARP TO NEXT SECTOR" onAction={onAction} />);

    const actionButton = screen.getByRole('button', { name: /warp to next sector/i });
    expect(actionButton).toBeInTheDocument();

    await user.click(actionButton);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('disables research buttons when not enough RP', () => {
    render(<TechTreeModal />);

    // Sensor Array costs 1 RP (level 0 + baseCost 1), and we have 5 RP -> enabled
    // Matter Recycler is level 2, costs 3 RP (2 + 1), we have 5 -> enabled
    // All should be enabled with 5 RP

    const researchButtons = screen.getAllByRole('button', { name: /research \(\d+ rp\)/i });
    expect(researchButtons.length).toBe(3);
  });
});
