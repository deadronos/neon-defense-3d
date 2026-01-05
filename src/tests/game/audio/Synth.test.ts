import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Synth, synth } from '../../../game/audio/Synth';

describe('Synth', () => {
  it('createImpulseResponse produces a buffer-like object', () => {
    const s = new Synth();
    const imp = s.createImpulseResponse(0.1, 1.0);
    // Mocked AudioBuffer returns an object with getChannelData
    expect(typeof imp.getChannelData).toBe('function');
    expect(imp.getChannelData(0).length).toBeGreaterThan(0);
  });

  it('setReverbMix clamps values and set volume setters work', () => {
    const s = new Synth();
    s.setReverbMix(1.5);
    // reverbSend exists in constructor in our mock and should clamp to 1
    // @ts-ignore
    expect(s.reverbSend.gain.value).toBe(1);

    s.setMasterVolume(0.25);
    // @ts-ignore
    expect(s.masterGain.gain.value).toBe(0.25);

    s.setSFXVolume(0.33);
    // @ts-ignore
    expect(s.sfxGain.gain.value).toBe(0.33);

    s.setMusicVolume(0.1);
    // @ts-ignore
    expect(s.musicGain.gain.value).toBe(0.1);
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