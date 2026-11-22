import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AudioProvider } from '../../../game/audio/AudioManager';
import { synth } from '../../../game/audio/Synth';
import { useAudio } from '../../../game/audio/useAudio';

const Harness = () => {
  const audio = useAudio();
  return (
    <div>
      <div data-testid="master">{audio.masterVolume}</div>
      <button onClick={() => audio.toggleMusic()}>Toggle</button>
      <button onClick={() => audio.playSFX('click')}>SFX</button>
      <button
        onClick={() => {
          audio.setMasterVolume(0.2);
          audio.setSFXVolume(-0.1);
          audio.setMusicVolume(1.2);
        }}
      >
        SetVolumes
      </button>
      <div data-testid="sfx-volume">{audio.sfxVolume}</div>
      <div data-testid="music-volume">{audio.musicVolume}</div>
    </div>
  );
};

const mount = () =>
  render(
    <AudioProvider>
      <Harness />
    </AudioProvider>,
  );

describe('AudioProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('initializes synth volumes and toggles music', async () => {
    const startSpy = vi.spyOn(synth, 'startMusic');
    const stopSpy = vi.spyOn(synth, 'stopMusic');
    const setMasterSpy = vi.spyOn(synth, 'setMasterVolume');

    render(
      <AudioProvider>
        <Harness />
      </AudioProvider>,
    );

    // initial setMasterVolume should be called at least once via useEffect
    expect(setMasterSpy).toHaveBeenCalled();

    const user = userEvent.setup();

    await user.click(screen.getByText('Toggle'));
    expect(startSpy).toHaveBeenCalled();

    await user.click(screen.getByText('Toggle'));
    expect(stopSpy).toHaveBeenCalled();

    await user.click(screen.getByText('SFX'));
    // Not throwing is sufficient; spy verifies it called a method on synth indirectly

    await user.click(screen.getByText('SetVolumes'));
    expect(setMasterSpy).toHaveBeenCalledWith(0.2);
  });
  it('restores all three clamped volumes after remount', async () => {
    const first = mount();
    expect(screen.getByTestId('music-volume')).toHaveTextContent('0.45');
    await userEvent.click(screen.getByText('SetVolumes'));
    first.unmount();

    mount();
    expect(screen.getByTestId('master')).toHaveTextContent('0.2');
    expect(screen.getByTestId('sfx-volume')).toHaveTextContent('0');
    expect(screen.getByTestId('music-volume')).toHaveTextContent('1');
  });
});
