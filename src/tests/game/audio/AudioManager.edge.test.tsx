import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, vi } from 'vitest';
import { AudioProvider, useAudio } from '../../../game/audio/AudioManager';
import { synth } from '../../../game/audio/Synth';

const Harness = () => {
  const a = useAudio();
  return (
    <div>
      <div data-testid="isMusic">{String(a.isMusicPlaying)}</div>
      <button onClick={() => a.toggleMusic()}>Toggle</button>
      <button onClick={() => a.setMasterVolume(0.1)}>SetMaster</button>
    </div>
  );
};

describe('AudioManager edge cases', () => {
  it('startMusic throwing leaves isMusicPlaying false', async () => {
    const startSpy = vi.spyOn(synth, 'startMusic').mockImplementation(() => {
      throw new Error('startfail');
    });

    render(
      <AudioProvider>
        <Harness />
      </AudioProvider>,
    );

    const user = userEvent.setup();
    await expect(user.click(screen.getByText('Toggle'))).rejects.toThrow('startfail');

    // Ensure state didn't flip
    expect(screen.getByTestId('isMusic')).toHaveTextContent('false');

    startSpy.mockRestore();
  });

  it('stopMusic throwing keeps isMusicPlaying true', async () => {
    // Ensure start works
    const startSpy = vi.spyOn(synth, 'startMusic').mockImplementation(() => {});
    const stopSpy = vi.spyOn(synth, 'stopMusic').mockImplementation(() => {
      throw new Error('stopfail');
    });

    render(
      <AudioProvider>
        <Harness />
      </AudioProvider>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByText('Toggle')); // start

    await waitFor(() => expect(screen.getByTestId('isMusic')).toHaveTextContent('true'));

    // Now attempt to stop; synth.stopMusic throws
    await expect(user.click(screen.getByText('Toggle'))).rejects.toThrow('stopfail');

    // isMusic should remain true
    expect(screen.getByTestId('isMusic')).toHaveTextContent('true');

    startSpy.mockRestore();
    stopSpy.mockRestore();
  });
});