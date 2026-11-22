import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';

import { KillStreakAnnouncer } from '../../components/ui/KillStreakAnnouncer';
import type { GameUiContextProps } from '../../game/contextTypes';
import { createInitialUiState } from '../../game/engine/uiReducer';
import * as GameContextsModule from '../../game/gameContexts';
import type { GameState } from '../../types';

describe('KillStreakAnnouncer', () => {
  const useGameUiMock = vi.spyOn(GameContextsModule, 'useGameUi');
  const baseUi = createInitialUiState();
  const baseGameState: GameState = {
    ...baseUi,
    isPlaying: baseUi.gameStatus === 'playing',
    announcement: baseUi.announcement,
  };
  const DOUBLE_KILL = 'DOUBLE KILL';
  const TRIPLE_KILL = 'TRIPLE KILL';

  const buildContext = (
    announcement: GameState['announcement'],
    clearAnnouncement = vi.fn(),
  ): GameUiContextProps =>
    ({
      gameState: { ...baseGameState, announcement },
      clearAnnouncement,
    }) as unknown as GameUiContextProps;

  beforeEach(() => {
    vi.useFakeTimers();
    useGameUiMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing initially', () => {
    useGameUiMock.mockReturnValue(buildContext(null));

    render(<KillStreakAnnouncer />);
    expect(screen.queryByText(DOUBLE_KILL)).not.toBeInTheDocument();
  });

  it('shows announcement when set', () => {
    useGameUiMock.mockReturnValue(buildContext({ id: 123, text: DOUBLE_KILL }));

    render(<KillStreakAnnouncer />);
    expect(screen.getByText(DOUBLE_KILL)).toBeInTheDocument();
  });

  it('hides announcement after 2 seconds and clears global state', () => {
    const clearAnnouncementMock = vi.fn();
    useGameUiMock.mockReturnValue(
      buildContext({ id: 123, text: DOUBLE_KILL }, clearAnnouncementMock),
    );

    render(<KillStreakAnnouncer />);
    expect(screen.getByText(DOUBLE_KILL)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText(DOUBLE_KILL)).not.toBeInTheDocument();
    expect(clearAnnouncementMock).toHaveBeenCalled();
  });

  it('resets timer when a new announcement arrives', () => {
    const clearAnnouncementMock = vi.fn();
    // Initial render with no announcement
    useGameUiMock.mockReturnValue(buildContext(null, clearAnnouncementMock));
    const { rerender } = render(<KillStreakAnnouncer />);

    // First announcement
    useGameUiMock.mockReturnValue(
      buildContext({ id: 1, text: DOUBLE_KILL }, clearAnnouncementMock),
    );
    rerender(<KillStreakAnnouncer />);

    expect(screen.getByText(DOUBLE_KILL)).toBeInTheDocument();

    // Advance 1s (halfway)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Change announcement
    useGameUiMock.mockReturnValue(
      buildContext({ id: 2, text: TRIPLE_KILL }, clearAnnouncementMock),
    );
    rerender(<KillStreakAnnouncer />);

    expect(screen.getByText(TRIPLE_KILL)).toBeInTheDocument();

    // Advance another 1.5s (Total 2.5s from start, but only 1.5s from second announcement)
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Should still be visible because timer reset
    expect(screen.getByText(TRIPLE_KILL)).toBeInTheDocument();
    expect(clearAnnouncementMock).not.toHaveBeenCalled();

    // Advance 0.5s more (Total 2s from second announcement)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText(TRIPLE_KILL)).not.toBeInTheDocument();
    expect(clearAnnouncementMock).toHaveBeenCalled();
  });
});
