import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';

import { KillStreakAnnouncer } from '../../components/ui/KillStreakAnnouncer';
import * as GameStateModule from '../../game/GameState';

describe('KillStreakAnnouncer', () => {
  const useGameMock = vi.spyOn(GameStateModule, 'useGame');

  beforeEach(() => {
    vi.useFakeTimers();
    useGameMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing initially', () => {
    useGameMock.mockReturnValue({
      gameState: { announcement: null } as any,
      clearAnnouncement: vi.fn(),
    } as any);

    render(<KillStreakAnnouncer />);
    expect(screen.queryByText('DOUBLE KILL')).not.toBeInTheDocument();
  });

  it('shows announcement when set', () => {
    useGameMock.mockReturnValue({
      gameState: {
        announcement: { id: 123, text: 'DOUBLE KILL' },
      } as any,
      clearAnnouncement: vi.fn(),
    } as any);

    render(<KillStreakAnnouncer />);
    expect(screen.getByText('DOUBLE KILL')).toBeInTheDocument();
  });

  it('hides announcement after 2 seconds and clears global state', () => {
    const clearAnnouncementMock = vi.fn();
    useGameMock.mockReturnValue({
      gameState: {
        announcement: { id: 123, text: 'DOUBLE KILL' },
      } as any,
      clearAnnouncement: clearAnnouncementMock,
    } as any);

    render(<KillStreakAnnouncer />);
    expect(screen.getByText('DOUBLE KILL')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('DOUBLE KILL')).not.toBeInTheDocument();
    expect(clearAnnouncementMock).toHaveBeenCalled();
  });

  it('resets timer when a new announcement arrives', () => {
    const clearAnnouncementMock = vi.fn();
    // Initial render with no announcement
    useGameMock.mockReturnValue({
      gameState: { announcement: null } as any,
      clearAnnouncement: clearAnnouncementMock,
    } as any);
    const { rerender } = render(<KillStreakAnnouncer />);

    // First announcement
    useGameMock.mockReturnValue({
      gameState: {
        announcement: { id: 1, text: 'DOUBLE KILL' },
      } as any,
      clearAnnouncement: clearAnnouncementMock,
    } as any);
    rerender(<KillStreakAnnouncer />);

    expect(screen.getByText('DOUBLE KILL')).toBeInTheDocument();

    // Advance 1s (halfway)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Change announcement
    useGameMock.mockReturnValue({
      gameState: {
        announcement: { id: 2, text: 'TRIPLE KILL' },
      } as any,
      clearAnnouncement: clearAnnouncementMock,
    } as any);
    rerender(<KillStreakAnnouncer />);

    expect(screen.getByText('TRIPLE KILL')).toBeInTheDocument();

    // Advance another 1.5s (Total 2.5s from start, but only 1.5s from second announcement)
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Should still be visible because timer reset
    expect(screen.getByText('TRIPLE KILL')).toBeInTheDocument();
    expect(clearAnnouncementMock).not.toHaveBeenCalled();

    // Advance 0.5s more (Total 2s from second announcement)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText('TRIPLE KILL')).not.toBeInTheDocument();
    expect(clearAnnouncementMock).toHaveBeenCalled();
  });
});
