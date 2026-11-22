import { describe, it, expect, vi } from 'vitest';

import { Synth } from '../../../game/audio/Synth';

describe('Synth', () => {
  it('createImpulseResponse produces a buffer-like object', () => {
    const s = new Synth();
    s.resume();
    const imp = s.createImpulseResponse(0.1, 1.0);
    // Mocked AudioBuffer returns an object with getChannelData
    expect(typeof imp.getChannelData).toBe('function');
    expect(imp.getChannelData(0).length).toBeGreaterThan(0);
  });

  it('defers context and impulse creation and applies cached settings on playback', () => {
    const create = vi.fn();
    class TrackedContext extends AudioContext {
      constructor() {
        super();
        create();
      }
    }
    vi.stubGlobal('AudioContext', TrackedContext);
    try {
      const s = new Synth();
      s.setReverbMix(1.5);
      s.setMasterVolume(0.25);
      s.setSFXVolume(0.33);
      s.setMusicVolume(0.1);
      expect(create).not.toHaveBeenCalled();
      expect(s.convolver).toBeNull();

      s.playSFX('click');
      expect(create).toHaveBeenCalledTimes(1);
      expect(s.convolver?.buffer).toBeTruthy();
      expect(s.reverbSend?.gain.value).toBe(1);
      expect(s.masterGain?.gain.value).toBe(0.25);
      expect(s.sfxGain?.gain.value).toBe(0.33);
      expect(s.musicGain?.gain.value).toBe(0.1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('routes master output through a compressor', () => {
    const connectGain = vi.fn();
    const compressor = {
      connect: vi.fn(),
      threshold: { value: 0 },
      ratio: { value: 0 },
    };
    class TrackedContext extends AudioContext {
      createGain() {
        return { gain: { value: 0 }, connect: connectGain } as unknown as GainNode;
      }
      createDynamicsCompressor() {
        return compressor as unknown as DynamicsCompressorNode;
      }
    }
    vi.stubGlobal('AudioContext', TrackedContext);
    try {
      const s = new Synth();
      s.resume();
      expect(connectGain).toHaveBeenCalledWith(compressor);
      expect(compressor.connect).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('throttles combat sounds, caps active voices and recycles ended voices', () => {
    const s = new Synth();
    s.resume();
    const ctx = s.ctx;
    if (!ctx) throw new Error('Expected initialized audio context');
    const clock = vi.spyOn(ctx, 'currentTime', 'get');
    clock.mockReturnValue(0);
    const createSource = vi.spyOn(ctx, 'createBufferSource');

    s.playSFX('shoot');
    s.playSFX('shoot');
    expect(createSource).toHaveBeenCalledTimes(1);
    const first = createSource.mock.results[0].value as AudioBufferSourceNode;
    expect(first.playbackRate.value).toBeGreaterThanOrEqual(0.94);
    expect(first.playbackRate.value).toBeLessThanOrEqual(1.06);

    for (const time of [0.03, 0.06, 0.09]) {
      clock.mockReturnValue(time);
      s.playSFX('shoot');
    }
    expect(createSource).toHaveBeenCalledTimes(3);
    first.onended?.(new Event('ended'));
    s.playSFX('shoot');
    expect(createSource).toHaveBeenCalledTimes(4);
  });

  it('playSFX does not throw for known buffer names and no buffer names', () => {
    const s = new Synth();
    expect(() => s.playSFX('click')).not.toThrow();
    expect(() => s.playSFX('unknown')).not.toThrow();
  });

  it('startMusic and stopMusic toggle isPlayingMusic', () => {
    const s = new Synth();
    expect(s.isPlayingMusic).toBe(false);
    s.startMusic();
    expect(s.isPlayingMusic).toBe(true);
    s.stopMusic();
    expect(s.isPlayingMusic).toBe(false);
  });
});
