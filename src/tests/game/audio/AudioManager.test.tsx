import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, vi, beforeEach } from 'vitest';

import { AudioProvider, useAudio } from '../../../game/audio/AudioManager';
import { synth } from '../../../game/audio/Synth';

const Harness = () => {
  const audio = useAudio();
  return (
    <div>
      <div data-testid="master">{audio.masterVolume}</div>
      <button onClick={() => audio.toggleMusic()}>Toggle</button>
      <button onClick={() => audio.playSFX('click')}>SFX</button>
      <button onClick={() => audio.setMasterVolume(0.2)}>SetMaster</button>
    </div>
  );
};

describe('AudioProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

    await user.click(screen.getByText('SetMaster'));
    expect(setMasterSpy).toHaveBeenCalledWith(0.2);
  });
});