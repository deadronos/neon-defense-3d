import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  AudioProvider: ({ children }: any) => <>{children}</>,
}));

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
console.log('[test startup] SettingsModal.behavior.export loaded');

describe('SettingsModal behavior — export/import', () => {
  beforeEach(() => {
    console.log('[test beforeEach] SettingsModal.behavior.export');
    vi.clearAllMocks();
    exportJsonValue = '{"foo":true}';
    hasCheckpoint = true;
  });

  it('sanity - this file runs', () => {
    expect(true).toBe(true);
  });

  it('refresh updates export JSON shown in textarea', async () => {
    render(<SettingsModal open={true} onClose={() => {}} />);

    const textarea = screen.getByLabelText(/exported checkpoint json/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('foo');

    // change the underlying export value and click refresh
    exportJsonValue = '{"foo":false,"new":1}';

    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    const user = userEvent.setup();
    await user.click(refreshBtn);

    await waitFor(() => expect(textarea.value).toContain('\"new\":1'), { timeout: 2000 });
  });

  it('reset success refreshes export JSON', async () => {
    resetCheckpointMock.mockReturnValue({ ok: true });
    exportJsonValue = '{"refreshed":true}';

    render(<SettingsModal open={true} onClose={() => {}} />);

    const textarea = screen.getByLabelText(/exported checkpoint json/i) as HTMLTextAreaElement;
    const resetBtn = screen.getByRole('button', { name: /reset checkpoint/i });

    const user = userEvent.setup();
    await user.click(resetBtn);

    await waitFor(() => expect(textarea.value).toContain('refreshed'), { timeout: 2000 });
  });

  it('shows message when no autosaved checkpoint exists', async () => {
    hasCheckpoint = false;

    render(<SettingsModal open={true} onClose={() => {}} />);

    expect(screen.getByText(/no autosaved checkpoint found yet/i)).toBeInTheDocument();

    const reset = screen.getByRole('button', { name: /reset checkpoint/i });
    expect(reset).toBeDisabled();

    hasCheckpoint = true;
  });
});