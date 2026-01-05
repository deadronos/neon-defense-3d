import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, vi, beforeEach, afterEach } from 'vitest';

// Mock audio hook (we only need volume values for inputs)
vi.mock('../../game/audio/AudioManager', () => ({
  useAudio: vi.fn().mockReturnValue({
    masterVolume: 0.5,
    sfxVolume: 1,
    musicVolume: 1,
    setMasterVolume: vi.fn(),
    setSFXVolume: vi.fn(),
    setMusicVolume: vi.fn(),
    playSFX: vi.fn(),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AudioProvider: ({ children }: any) => <>{children}</>,
}));

import { SettingsModal } from '../../components/ui/SettingsModal';
import { GameProvider } from '../../game/GameState';
import * as persistence from '../../game/persistence';
import * as audioModule from '../../game/audio/AudioManager';


describe('SettingsModal extras', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('copies export JSON to clipboard (success)', async () => {
    const user = userEvent.setup();
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined as any);

    render(
      <GameProvider>
        <SettingsModal open={true} onClose={() => {}} />
      </GameProvider>,
    );

    const copyBtn = screen.getByRole('button', { name: /copy/i });
    await user.click(copyBtn);

    await waitFor(() => expect(writeSpy).toHaveBeenCalled());
    expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
  });

  it('shows copy error when clipboard write fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('boom'));

    render(
      <GameProvider>
        <SettingsModal open={true} onClose={() => {}} />
      </GameProvider>,
    );

    const copyBtn = screen.getByRole('button', { name: /copy/i });
    await user.click(copyBtn);

    await waitFor(() => expect(screen.getByText(/copy failed/i)).toBeInTheDocument());
  });

  it('download export triggers link click', async () => {
    const user = userEvent.setup();
    const origCreate = document.createElement.bind(document);
    let clickSpy: ReturnType<typeof vi.spyOn> | undefined = undefined;
    vi.spyOn(document, 'createElement').mockImplementation((tagName: any) => {
      const el = origCreate(tagName) as HTMLElement;
      if (tagName === 'a') {
        // Spy on the anchor's click method so the DOM appendChild still accepts it
        clickSpy = vi.spyOn(el, 'click');
      }
      return el;
    });

    const createUrlSpy = vi.spyOn(URL, 'createObjectURL');

    render(
      <GameProvider>
        <SettingsModal open={true} onClose={() => {}} />
      </GameProvider>,
    );

    const dlBtn = screen.getByRole('button', { name: /download/i });
    await user.click(dlBtn);

    await waitFor(() => expect(createUrlSpy).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
  });

  it('shows warnings when migrateSave returns warnings', async () => {
    const user = userEvent.setup();

    const sample = {
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      ui: { currentMapIndex: 0, money: 100, lives: 20, researchPoints: 0, upgrades: {} },
      checkpoint: { waveToStart: 1, towers: [] },
    } as any;

    // Spy migrateSave to return a ready save with warnings
    vi.spyOn(persistence, 'migrateSave').mockReturnValue({ ok: true, save: sample, warnings: ['warn1'], errors: [] } as any);

    render(
      <GameProvider>
        <SettingsModal open={true} onClose={() => {}} />
      </GameProvider>,
    );

    const importArea = screen.getByLabelText(/import checkpoint json/i);
    await user.clear(importArea);
    await user.click(importArea);
    await user.paste(JSON.stringify(sample));

    await user.click(screen.getByRole('button', { name: /validate/i }));

    await waitFor(() => expect(screen.getByText(/warnings/i)).toBeInTheDocument());
  });

  it('file import read failure shows error', async () => {
    const user = userEvent.setup();
    render(
      <GameProvider>
        <SettingsModal open={true} onClose={() => {}} />
      </GameProvider>,
    );

    // Find the hidden input directly
    const input = document.querySelector('input[type=file]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    // Create a file-like object whose text() rejects
    const badFile = new File(['{}'], 'bad.json', { type: 'application/json' });
    // Mock File.prototype.text for this test to simulate read failure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origText = (File.prototype as any).text;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (File.prototype as any).text = function () {
      return Promise.reject(new Error('readfail'));
    };

    await user.upload(input as HTMLInputElement, badFile);

    await waitFor(() => expect(screen.getByText(/failed to read file/i)).toBeInTheDocument());

    // Restore prototype
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (File.prototype as any).text = origText;
  });

  it('audio sliders call useAudio setters', async () => {
    const user = userEvent.setup();

    // access mocked setters from the module mock
    const mockSetMaster = audioModule.useAudio().setMasterVolume;
    const mockSetSfx = audioModule.useAudio().setSFXVolume;
    const mockSetMusic = audioModule.useAudio().setMusicVolume;

    render(
      <GameProvider>
        <SettingsModal open={true} onClose={() => {}} />
      </GameProvider>,
    );

    const sliders = screen.getAllByRole('slider') as HTMLInputElement[];
    expect(sliders.length).toBeGreaterThanOrEqual(3);

    const master = sliders[0];
    const sfx = sliders[1];
    const music = sliders[2];

    await user.type(master, '{arrowright}');
    expect(mockSetMaster).toHaveBeenCalled();

    await user.type(sfx, '{arrowright}');
    expect(mockSetSfx).toHaveBeenCalled();

    await user.type(music, '{arrowright}');
    expect(mockSetMusic).toHaveBeenCalled();
  });
});
