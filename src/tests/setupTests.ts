/**
 * Global test setup configuration for Vitest and React Testing Library.
 * Mocks browser APIs like matchMedia and ResizeObserver that are not available in the test environment.
 */
// Setup file for Vitest + Testing Library
import '@testing-library/jest-dom';

// Mock `matchMedia` for tests (common for some components expecting it)
if (!globalThis.matchMedia) {
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

// @ts-ignore
global.ResizeObserver = global.ResizeObserver || ResizeObserverMock;

// Mock Web Audio API
if (!global.AudioContext) {
  // @ts-ignore
  global.AudioContext = class {
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
  };
}

// Mock useAudio in tests automatically?
// No, unit tests might want to test it or ignore it.
// The failure happens because `src/game/audio/Synth.ts` instantiates `new AudioContext()` at module scope.
// By mocking AudioContext global above, it should fix the crash.
