import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { VictoryPopup } from '../../components/VictoryPopup';

// Mock useGame hook
vi.mock('../../game/GameState', () => ({
  useGame: () => ({
    gameState: {
      researchPoints: 42,
    },
  }),
}));

describe('VictoryPopup', () => {
  it('renders victory message and research points', () => {
    render(<VictoryPopup onOpenTechTree={() => {}} />);

    expect(screen.getByText('Sector Cleared!')).toBeInTheDocument();
    expect(screen.getByText(/hostiles neutralized/i)).toBeInTheDocument();
    expect(screen.getByText(/research points: 42/i)).toBeInTheDocument();
  });

  it('calls onOpenTechTree when button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenTechTree = vi.fn();

    render(<VictoryPopup onOpenTechTree={onOpenTechTree} />);

    const button = screen.getByRole('button', { name: /open tech tree/i });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(onOpenTechTree).toHaveBeenCalledTimes(1);
  });

  it('displays the Open Tech Tree button with correct styling', () => {
    render(<VictoryPopup onOpenTechTree={() => {}} />);

    const button = screen.getByRole('button', { name: /open tech tree/i });
    expect(button).toHaveClass('bg-[#e94560]');
  });
});
