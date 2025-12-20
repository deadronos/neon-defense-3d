import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';

import { BuildMenu } from '../../components/ui/BuildMenu';
import { TOWER_CONFIGS } from '../../constants';
import { TowerType } from '../../types';

describe('BuildMenu', () => {
  const mockOnSelectTower = vi.fn();
  const defaultProps = {
    selectedTower: null,
    onSelectTower: mockOnSelectTower,
    money: 1000,
    upgrades: {},
  };

  beforeEach(() => {
    mockOnSelectTower.mockReset();
  });

  it('renders all tower types', () => {
    render(<BuildMenu {...defaultProps} />);

    // Check if buttons for each tower type exist
    Object.values(TowerType).forEach((type) => {
      const config = TOWER_CONFIGS[type];
      // Use getAllByText because text appears in button and tooltip
      expect(screen.getAllByText(config.name).length).toBeGreaterThan(0);
    });
  });

  it('calls onSelectTower when a tower is clicked', () => {
    render(<BuildMenu {...defaultProps} />);

    // Select via aria-label which is unique per button
    const basicConfig = TOWER_CONFIGS[TowerType.Basic];
    const basicTowerBtn = screen.getByRole('button', {
      name: new RegExp(`Select ${basicConfig.name}`, 'i'),
    });

    fireEvent.click(basicTowerBtn);

    expect(mockOnSelectTower).toHaveBeenCalledWith(TowerType.Basic);
  });

  it('does not call onSelectTower when tower is unaffordable', async () => {
    const user = userEvent.setup();
    render(<BuildMenu {...defaultProps} money={0} />);

    const basicConfig = TOWER_CONFIGS[TowerType.Basic];
    const button = screen.getByRole('button', {
      name: new RegExp(`Select ${basicConfig.name}`, 'i'),
    });

    await user.click(button);
    expect(mockOnSelectTower).not.toHaveBeenCalled();
  });

  it('deselects a selected tower on click (even if currently unaffordable)', async () => {
    const user = userEvent.setup();
    const basicConfig = TOWER_CONFIGS[TowerType.Basic];
    render(<BuildMenu {...defaultProps} money={0} selectedTower={TowerType.Basic} />);

    const button = screen.getByRole('button', {
      name: new RegExp(`Deselect ${basicConfig.name}`, 'i'),
    });

    // Selected towers should not be aria-disabled, so keyboard/mouse users can deselect.
    expect(button).toHaveAttribute('aria-disabled', 'false');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await user.click(button);
    expect(mockOnSelectTower).toHaveBeenCalledWith(null);
  });

  // UX & Accessibility Tests

  it('has accessible labels for tower buttons', () => {
    render(<BuildMenu {...defaultProps} />);

    const basicConfig = TOWER_CONFIGS[TowerType.Basic];
    const button = screen.getByRole('button', {
      name: new RegExp(`Select ${basicConfig.name}`, 'i'),
    });
    expect(button).toBeInTheDocument();
  });

  it('indicates selection state via aria-pressed', () => {
    render(<BuildMenu {...defaultProps} selectedTower={TowerType.Basic} />);

    const basicConfig = TOWER_CONFIGS[TowerType.Basic];
    // Label changes when selected
    const button = screen.getByRole('button', {
      name: new RegExp(`Deselect ${basicConfig.name}`, 'i'),
    });

    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('indicates unselected state via aria-pressed=false', () => {
    render(<BuildMenu {...defaultProps} selectedTower={TowerType.Basic} />);

    const rapidConfig = TOWER_CONFIGS[TowerType.Rapid];
    const button = screen.getByRole('button', {
      name: new RegExp(`Select ${rapidConfig.name}`, 'i'),
    });

    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('indicates disabled state via aria-disabled when unaffordable', () => {
    // Basic tower costs 50. Let's set money to 0.
    render(<BuildMenu {...defaultProps} money={0} />);

    const basicConfig = TOWER_CONFIGS[TowerType.Basic];
    const button = screen.getByRole('button', {
      name: new RegExp(`Select ${basicConfig.name}`, 'i'),
    });

    expect(button).toHaveAttribute('aria-disabled', 'true');
    // Ensure standard disabled attribute is NOT present (to allow tooltip hover)
    expect(button).not.toBeDisabled();
  });
});
