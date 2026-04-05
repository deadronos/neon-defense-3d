import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

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

describe('SettingsModal behavior', () => {
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

  describe('export/import', () => {
    it('refresh updates export JSON shown in textarea', async () => {
      render(<SettingsModal open={true} onClose={() => {}} />);

      const textarea = screen.getByLabelText<HTMLTextAreaElement>(/exported checkpoint json/i);
      expect(textarea.value).toContain('foo');

      // change the underlying export value and click refresh
      state.exportJsonValue = '{"foo":false,"new":1}';

      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      const user = userEvent.setup();
      await user.click(refreshBtn);

      await waitFor(() => expect(textarea.value).toContain('\"new\":1'), { timeout: 2000 });
    });

    it('reset success refreshes export JSON', async () => {
      state.resetCheckpointMock.mockReturnValue({ ok: true });
      state.exportJsonValue = '{"refreshed":true}';

      render(<SettingsModal open={true} onClose={() => {}} />);

      const textarea = screen.getByLabelText<HTMLTextAreaElement>(/exported checkpoint json/i);
      const resetBtn = screen.getByRole('button', { name: /reset checkpoint/i });

      const user = userEvent.setup();
      await user.click(resetBtn);

      await waitFor(() => expect(textarea.value).toContain('refreshed'), { timeout: 2000 });
    });

    it('shows message when no autosaved checkpoint exists', async () => {
      state.hasCheckpoint = false;

      render(<SettingsModal open={true} onClose={() => {}} />);

      expect(screen.getByText(/no autosaved checkpoint found yet/i)).toBeInTheDocument();

      const reset = screen.getByRole('button', { name: /reset checkpoint/i });
      expect(reset).toBeDisabled();

      state.hasCheckpoint = true;
    });
  });

  describe('reset & factory', () => {
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
});
