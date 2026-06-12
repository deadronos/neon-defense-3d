import { describe, it, expect, vi } from 'vitest';

import { SfxBufferCache, type SfxBufferFactory } from '../../../game/audio/internal/synthBuffers';

const fakeBuffer = { kind: 'fake' } as unknown as AudioBuffer;

const makeFactory = (): { factory: SfxBufferFactory; calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    factory: {
      click: (ctx: AudioContext) => {
        calls.push('click');
        expect(ctx).toBeDefined();
        return fakeBuffer;
      },
      shoot: () => {
        calls.push('shoot');
        return fakeBuffer;
      },
    },
  };
};

const makeCtx = (): AudioContext => ({}) as AudioContext;

describe('SfxBufferCache', () => {
  it('returns undefined for unknown names without invoking the factory', () => {
    const { factory, calls } = makeFactory();
    const cache = new SfxBufferCache(makeCtx(), factory);
    expect(cache.get('nope')).toBeUndefined();
    expect(calls).toEqual([]);
  });

  it('lazily builds the buffer on first get and caches it', () => {
    const { factory, calls } = makeFactory();
    const cache = new SfxBufferCache(makeCtx(), factory);
    expect(cache.get('click')).toBe(fakeBuffer);
    expect(cache.get('click')).toBe(fakeBuffer);
    expect(calls).toEqual(['click']);
  });

  it('does not call the factory in the constructor', () => {
    const factory = vi.fn(() => fakeBuffer);
    new SfxBufferCache(makeCtx(), { x: factory });
    expect(factory).not.toHaveBeenCalled();
  });
});
