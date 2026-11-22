import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
// matchMedia is unavailable in some test DOMs.
// eslint-disable-next-line typescript/no-unnecessary-condition
const media = () => (typeof window === 'undefined' ? undefined : window.matchMedia?.(query));
const subscribe = (listener: () => void) => {
  const preference = media();
  preference?.addEventListener('change', listener);
  return () => preference?.removeEventListener('change', listener);
};

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => media()?.matches ?? false,
    () => false,
  );
}
