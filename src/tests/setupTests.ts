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

// Provide a robust localStorage shim for tests.
const hasUsableLocalStorage = (() => {
  const localStorageCandidate = (globalThis as { localStorage?: unknown }).localStorage;
  if (typeof localStorageCandidate !== 'object' || localStorageCandidate === null) return false;
  const storageCandidate = localStorageCandidate as Partial<Storage>;
  return (
    typeof storageCandidate.getItem === 'function' &&
    typeof storageCandidate.setItem === 'function' &&
    typeof storageCandidate.removeItem === 'function' &&
    typeof storageCandidate.clear === 'function' &&
    typeof storageCandidate.key === 'function' &&
    typeof storageCandidate.length === 'number'
  );
})();

if (!hasUsableLocalStorage) {
  class TestStorage {
    private store: Record<string, string> = {};

    get length() {
      return Object.keys(this.store).length;
    }

    key(index: number): string | null {
      return Object.keys(this.store)[index] ?? null;
    }

    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
    }

    setItem(key: string, value: string): void {
      this.store[key] = String(value);
    }

    removeItem(key: string): void {
      delete this.store[key];
    }

    clear(): void {
      this.store = {};
    }
  }

  Object.defineProperty(globalThis, 'Storage', { value: TestStorage, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: new TestStorage(),
    configurable: true,
    writable: true,
  });
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
