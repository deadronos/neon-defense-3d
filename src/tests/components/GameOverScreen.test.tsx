import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { GameOverScreen } from '../../components/ui/GameOverScreen';

describe('GameOverScreen', () => {
  it('shows waves cleared and calls onReset', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    render(<GameOverScreen wave={7} onReset={onReset} />);

    expect(screen.getByText(/waves cleared/i)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reboot system/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
