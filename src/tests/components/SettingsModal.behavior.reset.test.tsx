import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, vi, beforeEach } from 'vitest';

// Mock AudioManager so SettingsModal can render without real provider
vi.mock('../../game/audio/AudioManager', () => ({
  useAudio: vi.fn(() => ({
    masterVolume: 0.5,
    sfxVolume: 1,
    musicVolume: 1,
    setMasterVolume: vi.fn(),
    setSFXVolume: vi.fn(),
    setMusicVolume: vi.fn(),
    playSFX: vi.fn(),
  })),
  AudioProvider: ({ children }: any) => <>{children}</>,
}));

// Mock GameState to control behaviors for SettingsModal
let exportJsonValue = '{"foo":true}';
let hasCheckpoint = true;
const resetCheckpointMock = vi.fn();
const factoryResetMock = vi.fn();

vi.mock('../../game/GameState', () => ({
  useGame: () => ({
    gameState: { graphicsQuality: 'high', waveStartedNonce: 0, gameStatus: 'idle', wave: 1, money: 0, lives: 0, upgrades: {} },
    setGraphicsQuality: vi.fn(),
    resetCheckpoint: () => resetCheckpointMock(),
    factoryReset: () => factoryResetMock(),
    applyCheckpointSave: vi.fn(),
    exportCheckpointJson: () => ({ json: exportJsonValue, hasCheckpoint }),
  }),
  GameProvider: ({ children }: any) => <>{children}</>,
}));

import { SettingsModal } from '../../components/ui/SettingsModal';

// quick load log to detect scheduling/hang issues
console.log('[test startup] SettingsModal.behavior.reset loaded');

describe('SettingsModal behavior — reset & factory', () => {
  beforeEach(() => {
    console.log('[test beforeEach] SettingsModal.behavior.reset');
    vi.clearAllMocks();
    exportJsonValue = '{"foo":true}';
    hasCheckpoint = true;
    resetCheckpointMock.mockReset();
    factoryResetMock.mockReset();
  });

  it('sanity - this file runs', () => {
    expect(true).toBe(true);
  });

  it('shows reset error when resetCheckpoint returns error', async () => {
    // make resetCheckpoint return error
    resetCheckpointMock.mockReturnValue({ ok: false, error: 'No checkpoint present' });

    render(<SettingsModal open={true} onClose={() => {}} />);

    const resetBtn = screen.getByRole('button', { name: /reset checkpoint/i });
    expect(resetBtn).not.toBeDisabled();

    const user = userEvent.setup();
    await user.click(resetBtn);

    await waitFor(() => expect(screen.getByText(/no checkpoint present/i)).toBeInTheDocument(), { timeout: 2000 });
  });

  it('calls factoryReset when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SettingsModal open={true} onClose={() => {}} />);

    const user = userEvent.setup();
    const factoryBtn = screen.getByRole('button', { name: /factory reset/i });
    await user.click(factoryBtn);

    await waitFor(() => expect(factoryResetMock).toHaveBeenCalled(), { timeout: 2000 });
  });

  it('factory reset cancelled does not call factoryReset', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SettingsModal open={true} onClose={() => {}} />);

    const user = userEvent.setup();
    const factoryBtn = screen.getByRole('button', { name: /factory reset/i });
    await user.click(factoryBtn);

    expect(factoryResetMock).not.toHaveBeenCalled();
  });
});