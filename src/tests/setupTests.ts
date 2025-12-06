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
