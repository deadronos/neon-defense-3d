/**
 * Global test setup configuration for Vitest and React Testing Library.
 * Mocks browser APIs like matchMedia and ResizeObserver that are not available in the test environment.
 */
// Setup file for Vitest + Testing Library
import '@testing-library/jest-dom';

const env = globalThis as unknown as {
  matchMedia?: unknown;
  ResizeObserver?: unknown;
  AudioContext?: unknown;
};

// Mock `matchMedia` for tests (common for some components expecting it)
if (typeof env.matchMedia !== 'function') {
  Object.defineProperty(globalThis, 'matchMedia', {
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      addListener: () => {},
      removeListener: () => {},
    }),
    configurable: true,
  });
}

// Minimal ResizeObserver mock for components that access it
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof env.ResizeObserver !== 'function') {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    configurable: true,
  });
}

// Mock Web Audio API

// Provide a robust localStorage shim for tests (some environments may lack clear())
if (typeof (globalThis as any).localStorage === 'undefined') {
  class LocalStorageShim {
    private _store: Record<string, string> = {};
    get length() {
      return Object.keys(this._store).length;
    }
    key(i: number) {
      return Object.keys(this._store)[i] ?? null;
    }
    getItem(k: string) {
      return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null;
    }
    setItem(k: string, v: string) {
      this._store[k] = String(v);
    }
    removeItem(k: string) {
      delete this._store[k];
    }
    clear() {
      for (const k of Object.keys(this._store)) delete this._store[k];
    }
  }
  try {
    Object.defineProperty(globalThis as any, 'Storage', {
      value: LocalStorageShim,
      configurable: true,
    });
  } catch {}
  try {
    Object.defineProperty(globalThis as any, 'localStorage', {
      value: new (LocalStorageShim as any)(),
      configurable: true,
    });
  } catch {
    (globalThis as any).localStorage = new (LocalStorageShim as any)();
  }
} else if (typeof (globalThis as any).localStorage.clear !== 'function') {
  // Try to augment the existing localStorage so that it has a clear() and preserves its prototype
  try {
    const st = (globalThis as any).localStorage;
    // If Storage.prototype exists, set prototype so tests that spy on Storage.prototype will work
    if (typeof (globalThis as any).Storage === 'function' && (Storage as any).prototype) {
      try {
        Object.setPrototypeOf(st, (Storage as any).prototype);
      } catch {
        // ignore
      }
    }

    const defineClear = () => {
      try {
        Object.defineProperty(st, 'clear', {
          value: function clearShim() {
            const keys: string[] = [];
            for (let i = 0; i < (this as Storage).length; i++) {
              const k = (this as Storage).key(i);
              if (k) keys.push(k);
            }
            for (const k of keys) {
              (this as Storage).removeItem(k);
            }
          },
          configurable: true,
        });
      } catch {
        // fallback to direct assignment
        try {
          st.clear = function clearShimFallback() {
            const keys: string[] = [];
            for (let i = 0; i < (st as Storage).length; i++) {
              const k = (st as Storage).key(i);
              if (k) keys.push(k);
            }
            for (const k of keys) (st as Storage).removeItem(k);
          };
        } catch {}
      }
    };

    defineClear();
  } catch {
    try {
      (globalThis as any).localStorage.clear = () => {};
    } catch {}
  }
}

// Mock Web Audio API
if (typeof env.AudioContext !== 'function') {
  Object.defineProperty(globalThis, 'AudioContext', {
    value: class {
      state = 'suspended';
      createGain() {
        return { connect: () => {}, gain: { value: 0 } };
      }
      createOscillator() {
        return {
          connect: () => {},
          start: () => {},
          stop: () => {},
          type: 'sine',
          frequency: { value: 0 },
          detune: { value: 0 },
        };
      }

      createBiquadFilter() {
        return {
          type: 'lowpass',
          frequency: { value: 1000 },
          Q: { value: 1 },
          connect: () => {},
          disconnect: () => {},
        };
      }

      createDelay() {
        return {
          delayTime: { value: 0 },
          connect: () => {},
          disconnect: () => {},
        };
      }
      createConvolver() {
        return {
          buffer: null,
          connect: () => {},
          disconnect: () => {},
        };
      }
      createBufferSource() {
        return { connect: () => {}, start: () => {}, stop: () => {}, buffer: null };
      }
      createBuffer(_channels: number, length: number, _sampleRate: number) {
        return { getChannelData: () => new Float32Array(length) };
      }
      resume() {
        return Promise.resolve();
      }
      get destination() {
        return {};
      }
      get sampleRate() {
        return 44100;
      }
    },
    configurable: true,
  });
}

// Mock useAudio in tests automatically?
// No, unit tests might want to test it or ignore it.
// The failure happens because `src/game/audio/Synth.ts` instantiates `new AudioContext()` at module scope.
// By mocking AudioContext global above, it should fix the crash.
