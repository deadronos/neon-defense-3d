import { useEffect, useEffectEvent } from 'react';

export function ignoresGameShortcut(event: KeyboardEvent) {
  return (
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    (event.target instanceof Element &&
      Boolean(
        event.target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
        ),
      ))
  );
}

export function useGameShortcut(handler: (event: KeyboardEvent) => void, enabled = true) {
  const handleShortcut = useEffectEvent(handler);
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      if (!event.repeat && !ignoresGameShortcut(event)) handleShortcut(event);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [enabled]);
}
