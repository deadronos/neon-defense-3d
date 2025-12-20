import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TopBar } from '../../components/ui/TopBar';
import type { WaveState } from '../../types';

describe('TopBar', () => {
  it('highlights low integrity (lives < 10) with pulse styling', () => {
    render(
      <TopBar
        lives={9}
        money={0}
        wave={1}
        waveState={null}
        graphicsQuality="high"
        onToggleGraphicsQuality={() => {}}
      />,
    );

    expect(screen.getByText('9%')).toHaveClass('animate-pulse');
  });

  it('renders lives, money, wave and toggles graphics quality', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <TopBar
        lives={20}
        money={123}
        wave={3}
        waveState={null}
        graphicsQuality="high"
        onToggleGraphicsQuality={onToggle}
      />,
    );

    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('$123')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /toggle graphics quality/i });
    expect(toggle).toHaveTextContent(/quality:\s*high/i);

    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows NEXT WAVE label and countdown timer when preparing with time remaining', () => {
    const waveState: WaveState = {
      wave: 5,
      phase: 'preparing',
      nextWaveTime: 0,
      enemiesAlive: 0,
      enemiesRemainingToSpawn: 0,
      timer: 1.234,
    };

    render(
      <TopBar
        lives={20}
        money={0}
        wave={5}
        waveState={waveState}
        graphicsQuality="low"
        onToggleGraphicsQuality={() => {}}
      />,
    );

    expect(screen.getByText(/next wave/i)).toBeInTheDocument();
    expect(screen.getByText('1.2s')).toBeInTheDocument();
  });

  it('does not show countdown timer when not preparing', () => {
    const waveState: WaveState = {
      wave: 5,
      phase: 'active',
      nextWaveTime: 0,
      enemiesAlive: 1,
      enemiesRemainingToSpawn: 1,
      timer: 99,
    };

    render(
      <TopBar
        lives={20}
        money={0}
        wave={5}
        waveState={waveState}
        graphicsQuality="low"
        onToggleGraphicsQuality={() => {}}
      />,
    );

    expect(screen.getByText(/wave index/i)).toBeInTheDocument();
    // Only preparing renders a "Xs" countdown (e.g. 1.2s)
    expect(screen.queryByText(/\d+\.\ds$/)).not.toBeInTheDocument();
  });
});
