import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, vi, beforeEach } from 'vitest';

vi.mock('../../game/audio/useAudio', () => ({
  useAudio: vi.fn().mockReturnValue({
    masterVolume: 0.5,
    sfxVolume: 1,
    musicVolume: 1,
    setMasterVolume: vi.fn(),
    setSFXVolume: vi.fn(),
    setMusicVolume: vi.fn(),
    playSFX: vi.fn(),
  }),
}));

import { SettingsModal } from '../../components/ui/SettingsModal';
import { useAudio } from '../../game/audio/useAudio';
import { GameProvider } from '../../game/GameState';
import type { MigrateResult, SaveV1 } from '../../game/persistence';
import * as persistence from '../../game/persistence';

describe('SettingsModal extras', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('copies export JSON to clipboard (success)', async () => {
    const user = userEvent.setup();
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

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
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreate(tagName);
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

    const sample: SaveV1 = {
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      ui: {
        currentMapIndex: 0,
        money: 100,
        lives: 20,
        totalEarned: 0,
        totalSpent: 0,
        totalDamageDealt: 0,
        totalCurrencyEarned: 0,
        researchPoints: 0,
        upgrades: {},
      },
      checkpoint: { waveToStart: 1, towers: [] },
    };

    // Spy migrateSave to return a ready save with warnings
    vi.spyOn(persistence, 'migrateSave').mockReturnValue({
      ok: true,
      save: sample,
      warnings: ['warn1'],
      errors: [],
    } as MigrateResult);

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
    const input = document.querySelector('input[type=file]');
    expect(input).not.toBeNull();

    // Create a file-like object whose text() rejects
    const badFile = new File(['{}'], 'bad.json', { type: 'application/json' });
    // Mock File.prototype.text for this test to simulate read failure
    const origText = File.prototype.text;
    File.prototype.text = function () {
      return Promise.reject(new Error('readfail'));
    };

    await user.upload(input as HTMLInputElement, badFile);

    await waitFor(() => expect(screen.getByText(/failed to read file/i)).toBeInTheDocument());

    // Restore prototype
    File.prototype.text = origText;
  });

  it('audio sliders call useAudio setters', async () => {
    render(
      <GameProvider>
        <SettingsModal open={true} onClose={() => {}} />
      </GameProvider>,
    );

    // retrieve the instance returned by the mocked useAudio as used by the component
    const mockUse = useAudio as unknown as {
      mock: { results: Array<{ value: ReturnType<typeof useAudio> }> };
    };
    // the vi mock stores call/return data under `.mock.results`
    const lastResult = mockUse.mock.results[mockUse.mock.results.length - 1];
    const {
      setMasterVolume: mockSetMaster,
      setSFXVolume: mockSetSfx,
      setMusicVolume: mockSetMusic,
    } = lastResult.value;

    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(3);

    const master = sliders[0];
    const sfx = sliders[1];
    const music = sliders[2];

    // change values via input event

    fireEvent.input(master, { target: { value: '0.6' } });
    await waitFor(() => expect(mockSetMaster).toHaveBeenCalled());

    fireEvent.input(sfx, { target: { value: '0.9' } });
    await waitFor(() => expect(mockSetSfx).toHaveBeenCalled());

    fireEvent.input(music, { target: { value: '0.8' } });
    await waitFor(() => expect(mockSetMusic).toHaveBeenCalled());
  });
});
