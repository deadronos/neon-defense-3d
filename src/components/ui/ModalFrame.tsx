import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalFrameProps {
  label: string;
  restoreFocusTo?: Element | null;
  onClose?: () => void;
  className: string;
  children: ReactNode;
}

const focusable = 'button, input, textarea, select, a[href], [tabindex], [contenteditable="true"]';

export function ModalFrame({
  label,
  onClose,
  restoreFocusTo,
  className,
  children,
}: ModalFrameProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = restoreFocusTo ?? document.activeElement;
    panelRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [restoreFocusTo]);

  return (
    <div
      role="presentation"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      {/* The dialog itself receives focus and handles keyboard navigation. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`overflow-hidden rounded-lg border border-cyan-500/40 bg-zinc-950/95 shadow-[0_0_40px_rgba(34,211,238,0.18)] ${className}`}
        onKeyDown={(event) => {
          if (
            event.key === 'Escape' &&
            onClose &&
            !event.defaultPrevented &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.stopPropagation();
            onClose();
          }
          if (event.key !== 'Tab' || event.defaultPrevented) return;
          const panel = event.currentTarget;
          const items = [...panel.querySelectorAll<HTMLElement>(focusable)].filter(
            (item) =>
              item.tabIndex >= 0 &&
              !item.matches(':disabled, input[type="hidden"]') &&
              !item.closest('[hidden], [inert]') &&
              getComputedStyle(item).visibility === 'visible' &&
              getComputedStyle(item).display !== 'none',
          );
          const target = document.activeElement;
          if (
            !items.length ||
            !items.some((item) => item === target) ||
            target === (event.shiftKey ? items[0] : items.at(-1))
          ) {
            event.preventDefault();
            ((event.shiftKey ? items.at(-1) : items[0]) ?? panel).focus();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
