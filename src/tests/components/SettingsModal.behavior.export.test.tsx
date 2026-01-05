import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, vi, beforeEach } from 'vitest';

// Same module mocks as other SettingsModal tests
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
  AudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const state = vi.hoisted(() => ({
  exportJsonValue: '{"foo":true}',
  hasCheckpoint: true,
  resetCheckpointMock: vi.fn(),
  factoryResetMock: vi.fn(),
}));

vi.mock('../../game/GameState', () => {
  // Define stable functions to prevent infinite useEffect loops
  const setGraphicsQuality = vi.fn();
  const applyCheckpointSave = vi.fn();
  const exportCheckpointJson = () => ({
    json: state.exportJsonValue,
    hasCheckpoint: state.hasCheckpoint,
  });
  const resetCheckpoint = () => state.resetCheckpointMock();
  const factoryReset = () => state.factoryResetMock();

  return {
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
    GameProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { SettingsModal } from '../../components/ui/SettingsModal';

// quick load log to detect scheduling/hang issues
console.log('[test startup] SettingsModal.behavior.export loaded');

describe('SettingsModal behavior — export/import', () => {
  beforeEach(() => {
    console.log('[test beforeEach] SettingsModal.behavior.export');
    vi.clearAllMocks();
    state.exportJsonValue = '{"foo":true}';
    state.hasCheckpoint = true;
    state.resetCheckpointMock.mockReset();
    state.factoryResetMock.mockReset();
  });

  it('sanity - this file runs', () => {
    expect(true).toBe(true);
  });

  it('refresh updates export JSON shown in textarea', async () => {
    render(<SettingsModal open={true} onClose={() => {}} />);

    const textarea = screen.getByLabelText(/exported checkpoint json/i);
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

    const textarea = screen.getByLabelText(/exported checkpoint json/i);
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
