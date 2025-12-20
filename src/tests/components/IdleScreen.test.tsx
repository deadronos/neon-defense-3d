import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { IdleScreen } from '../../components/ui/IdleScreen';

describe('IdleScreen', () => {
  it('calls onStart when INITIATE is clicked', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();

    render(<IdleScreen onStart={onStart} />);

    await user.click(screen.getByRole('button', { name: /initiate/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
