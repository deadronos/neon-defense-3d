import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TopBar } from '../../components/ui/TopBar';
import type { WaveState } from '../../types';

vi.mock('../../game/audio/AudioManager', () => ({
  useAudio: () => ({
    toggleMusic: vi.fn(),
    isMusicPlaying: false,
  }),
}));

describe('TopBar', () => {
  it('highlights low integrity (lives < 10) with pulse styling', () => {
    render(
      <TopBar
        lives={9}
        money={0}
        wave={1}
        waveState={null}
        onOpenSettings={() => {}}
        onSkipWave={() => {}}
        gameSpeed={1}
        onSetGameSpeed={() => {}}
      />,
    );

    expect(screen.getByText('9%')).toHaveClass('animate-pulse');
  });

  it('renders lives, money, wave and opens settings', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();

    render(
      <TopBar
        lives={20}
        money={123}
        wave={3}
        waveState={null}
        onOpenSettings={onOpenSettings}
        onSkipWave={() => {}}
        gameSpeed={1}
        onSetGameSpeed={() => {}}
      />,
    );

    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('$123')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    const settings = screen.getByRole('button', { name: /open settings/i });
    expect(settings).toBeInTheDocument();

    await user.click(settings);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
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
        onOpenSettings={() => {}}
        onSkipWave={() => {}}
        gameSpeed={1}
        onSetGameSpeed={() => {}}
      />,
    );

    expect(screen.getByText(/next wave/i)).toBeInTheDocument();
    expect(screen.getByText('1.2s')).toBeInTheDocument();
  });

  it('shows skip button when preparing and calls onSkipWave when clicked', async () => {
    const user = userEvent.setup();
    const onSkipWave = vi.fn();
    const waveState: WaveState = {
      wave: 5,
      phase: 'preparing',
      nextWaveTime: 0,
      enemiesAlive: 0,
      enemiesRemainingToSpawn: 0,
      timer: 5,
    };

    render(
      <TopBar
        lives={20}
        money={0}
        wave={5}
        waveState={waveState}
        onOpenSettings={() => {}}
        onSkipWave={onSkipWave}
        gameSpeed={1}
        onSetGameSpeed={() => {}}
      />,
    );

    const skipButton = screen.getByRole('button', { name: /skip to next wave/i });
    expect(skipButton).toBeInTheDocument();

    await user.click(skipButton);
    expect(onSkipWave).toHaveBeenCalledTimes(1);
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
        onOpenSettings={() => {}}
        onSkipWave={() => {}}
        gameSpeed={1}
        onSetGameSpeed={() => {}}
      />,
    );

    expect(screen.getByText(/wave index/i)).toBeInTheDocument();
    // Only preparing renders a "Xs" countdown (e.g. 1.2s)
    expect(screen.queryByText(/\d+\.\ds$/)).not.toBeInTheDocument();
  });

  it('renders speed controls and handles clicks', async () => {
    const user = userEvent.setup();
    const onSetGameSpeed = vi.fn();

    render(
      <TopBar
        lives={20}
        money={0}
        wave={1}
        waveState={null}
        onOpenSettings={() => {}}
        onSkipWave={() => {}}
        gameSpeed={1}
        onSetGameSpeed={onSetGameSpeed}
      />,
    );

    const speed1x = screen.getByRole('button', { name: /1x/i });
    const speed2x = screen.getByRole('button', { name: /2x/i });
    const speed4x = screen.getByRole('button', { name: /4x/i });

    expect(speed1x).toBeInTheDocument();
    expect(speed2x).toBeInTheDocument();
    expect(speed4x).toBeInTheDocument();

    await user.click(speed2x);
    expect(onSetGameSpeed).toHaveBeenCalledWith(2);

    await user.click(speed4x);
    expect(onSetGameSpeed).toHaveBeenCalledWith(4);
  });
});
