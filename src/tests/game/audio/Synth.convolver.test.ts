import { describe, it, expect, vi } from 'vitest';
import { Synth } from '../../../game/audio/Synth';

describe('Synth convolver fallback', () => {
  it('sets convolver to null when createConvolver throws', () => {
    // Force AudioContext.createConvolver to throw
    // @ts-ignore
    const OrigAC = global.AudioContext;

    class BadAC extends OrigAC {
      createConvolver() {
        throw new Error('no convolver');
      }
    }

    // @ts-ignore
    global.AudioContext = BadAC;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const s = new Synth();
    expect(s.convolver).toBeNull();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    // @ts-ignore
    global.AudioContext = OrigAC;
  });

  it('setReverbMix no-op when reverbSend is null', () => {
    const s = new Synth();
    // @ts-ignore
    s.reverbSend = null;
    expect(() => s.setReverbMix(0.5)).not.toThrow();
  });

  it('startMusic handles filter/delay creation failures gracefully', () => {
    const s = new Synth();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Make s.ctx.createBiquadFilter and createDelay throw when startMusic runs
    // @ts-ignore
    s.ctx.createBiquadFilter = function () {
      throw new Error('no filter');
    };
    // @ts-ignore
    s.ctx.createDelay = function () {
      throw new Error('no delay');
    };

    // call startMusic which should catch the filter/delay errors
    expect(() => s.startMusic()).not.toThrow();
    // Should emit a warning when filter/delay failed
    expect(warn).toHaveBeenCalled();

    // Restore
    warn.mockRestore();
  });
});