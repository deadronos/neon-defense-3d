import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';

import { KillStreakAnnouncer } from '../../components/ui/KillStreakAnnouncer';
import type { GameContextProps } from '../../game/contextTypes';
import { createInitialUiState } from '../../game/engine/uiReducer';
import * as GameStateModule from '../../game/GameState';
import type { GameState } from '../../types';

describe('KillStreakAnnouncer', () => {
  const useGameMock = vi.spyOn(GameStateModule, 'useGame');
  const baseUi = createInitialUiState();
  const baseGameState: GameState = {
    ...baseUi,
    isPlaying: baseUi.gameStatus === 'playing',
    announcement: baseUi.announcement,
  };

  const buildContext = (
    announcement: GameState['announcement'],
    clearAnnouncement = vi.fn(),
  ): GameContextProps =>
    ({
      gameState: { ...baseGameState, announcement },
      clearAnnouncement,
    }) as unknown as GameContextProps;

  beforeEach(() => {
    vi.useFakeTimers();
    useGameMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing initially', () => {
    useGameMock.mockReturnValue(buildContext(null));

    render(<KillStreakAnnouncer />);
    expect(screen.queryByText('DOUBLE KILL')).not.toBeInTheDocument();
  });

  it('shows announcement when set', () => {
    useGameMock.mockReturnValue(buildContext({ id: 123, text: 'DOUBLE KILL' }));

    render(<KillStreakAnnouncer />);
    expect(screen.getByText('DOUBLE KILL')).toBeInTheDocument();
  });

  it('hides announcement after 2 seconds and clears global state', () => {
    const clearAnnouncementMock = vi.fn();
    useGameMock.mockReturnValue(
      buildContext({ id: 123, text: 'DOUBLE KILL' }, clearAnnouncementMock),
    );

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
    useGameMock.mockReturnValue(buildContext(null, clearAnnouncementMock));
    const { rerender } = render(<KillStreakAnnouncer />);

    // First announcement
    useGameMock.mockReturnValue(
      buildContext({ id: 1, text: 'DOUBLE KILL' }, clearAnnouncementMock),
    );
    rerender(<KillStreakAnnouncer />);

    expect(screen.getByText('DOUBLE KILL')).toBeInTheDocument();

    // Advance 1s (halfway)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Change announcement
    useGameMock.mockReturnValue(
      buildContext({ id: 2, text: 'TRIPLE KILL' }, clearAnnouncementMock),
    );
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
