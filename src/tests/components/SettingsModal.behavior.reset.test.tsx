import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, vi, beforeEach } from 'vitest';

// Mock useAudio so SettingsModal can render without real provider
vi.mock('../../game/audio/useAudio', () => ({
  useAudio: vi.fn(() => ({
    masterVolume: 0.5,
    sfxVolume: 1,
    musicVolume: 1,
    setMasterVolume: vi.fn(),
    setSFXVolume: vi.fn(),
    setMusicVolume: vi.fn(),
    playSFX: vi.fn(),
  })),
}));

const state = vi.hoisted(() => ({
  exportJsonValue: '{"foo":true}',
  hasCheckpoint: true,
  resetCheckpointMock: vi.fn(),
  factoryResetMock: vi.fn(),
}));

const setGraphicsQuality = vi.fn();
const applyCheckpointSave = vi.fn();
const exportCheckpointJson = () => ({
  json: state.exportJsonValue,
  hasCheckpoint: state.hasCheckpoint,
});
const resetCheckpoint = () => state.resetCheckpointMock();
const factoryReset = () => state.factoryResetMock();

vi.mock('../../game/gameContexts', () => ({
  useGame: () => ({
    gameState: {
      graphicsQuality: 'high',
      waveStartedNonce: 0,
      gameStatus: 'idle',
      wave: 1,
      money: 0,
      lives: 0,
      upgrades: {},
    },
    setGraphicsQuality,
    resetCheckpoint,
    factoryReset,
    applyCheckpointSave,
    exportCheckpointJson,
  }),
}));

import { SettingsModal } from '../../components/ui/SettingsModal';

describe('SettingsModal behavior — reset & factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.exportJsonValue = '{"foo":true}';
    state.hasCheckpoint = true;
    state.resetCheckpointMock.mockReset();
    state.factoryResetMock.mockReset();
  });

  it('sanity - this file runs', () => {
    expect(true).toBe(true);
  });

  it('shows reset error when resetCheckpoint returns error', async () => {
    // make resetCheckpoint return error
    state.resetCheckpointMock.mockReturnValue({ ok: false, error: 'No checkpoint present' });

    render(<SettingsModal open={true} onClose={() => {}} />);

    const resetBtn = screen.getByRole('button', { name: /reset checkpoint/i });
    expect(resetBtn).not.toBeDisabled();

    const user = userEvent.setup();
    await user.click(resetBtn);

    await waitFor(() => expect(screen.getByText(/no checkpoint present/i)).toBeInTheDocument(), {
      timeout: 2000,
    });
  });

  it('calls factoryReset when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SettingsModal open={true} onClose={() => {}} />);

    const user = userEvent.setup();
    const factoryBtn = screen.getByRole('button', { name: /factory reset/i });
    await user.click(factoryBtn);

    await waitFor(() => expect(state.factoryResetMock).toHaveBeenCalled(), { timeout: 2000 });
  });

  it('factory reset cancelled does not call factoryReset', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SettingsModal open={true} onClose={() => {}} />);

    const user = userEvent.setup();
    const factoryBtn = screen.getByRole('button', { name: /factory reset/i });
    await user.click(factoryBtn);

    expect(state.factoryResetMock).not.toHaveBeenCalled();
  });
});
