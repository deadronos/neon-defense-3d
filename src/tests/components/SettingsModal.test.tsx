import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useEffect, useMemo } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { UI } from '../../components/UI';
import { SettingsModal } from '../../components/ui/SettingsModal';
import { useAudio } from '../../game/audio/AudioManager';
import { GameProvider, useGame } from '../../game/GameState';
import type { Vector2 } from '../../types';
import { TileType, TowerType } from '../../types';

vi.mock('../../game/audio/AudioManager', () => ({
  useAudio: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AudioProvider: ({ children }: any) => <>{children}</>,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseAudio = useAudio as any;

const findFirstBuildableSpot = (grid: TileType[][]): Vector2 | null => {
  for (let z = 0; z < grid.length; z++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[z][x] === TileType.Grass) return [x, z];
    }
  }
  return null;
};

const Harness = ({ open }: { open: boolean }) => {
  const game = useGame();

  return (
    <>
      <div data-testid="status">{game.gameState.gameStatus}</div>
      <div data-testid="towers">{game.towers.length}</div>
      <SettingsModal open={open} onClose={() => {}} />
    </>
  );
};

describe('SettingsModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockUseAudio.mockReturnValue({
      masterVolume: 0.5,
      sfxVolume: 1,
      musicVolume: 1,
      setMasterVolume: vi.fn(),
      setSFXVolume: vi.fn(),
      setMusicVolume: vi.fn(),
      playSFX: vi.fn(),
    });
  });

  it('blocks invalid JSON import and does not change the current run', async () => {
    const user = userEvent.setup();

    render(
      <GameProvider>
        <Harness open={true} />
      </GameProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('towers')).toHaveTextContent('0');

    const importArea = screen.getByLabelText(/import checkpoint json/i);
    await user.clear(importArea);
    await user.click(importArea);
    await user.paste('{');

    await user.click(screen.getByRole('button', { name: /validate/i }));

    expect(screen.getByText(/import blocked/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^apply$/i })).toBeDisabled();

    // Ensure nothing changed.
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('towers')).toHaveTextContent('0');
  });

  it('enables Reset Checkpoint if an autosave happens while the modal is open (full UI flow)', async () => {
    const user = userEvent.setup();

    const TestApp = () => {
      const game = useGame();
      const firstSpot = useMemo(() => findFirstBuildableSpot(game.mapGrid), [game.mapGrid]);

      useEffect(() => {
        if (game.gameState.gameStatus !== 'playing') return;
        if (!firstSpot) return;
        if (game.towers.length > 0) return;

        // Ensure a tower exists before wave 1 starts so autosave has something to include.
        game.placeTower(firstSpot[0], firstSpot[1], TowerType.Basic);
      }, [game, firstSpot, game.gameState.gameStatus, game.towers.length]);

      return (
        <>
          <div data-testid="status">{game.gameState.gameStatus}</div>
          <div data-testid="towers">{game.towers.length}</div>
          <UI />
          <button type="button" onClick={() => game.step(5.1, 5.1)}>
            Trigger wave start
          </button>
        </>
      );
    };

    render(
      <GameProvider>
        <TestApp />
      </GameProvider>,
    );

    // Start the game via the IdleScreen's INITIATE button.
    const initiateBtn = screen.getByRole('button', { name: /initiate/i });
    await user.click(initiateBtn);

    // Open settings from the TopBar.
    const openSettings = await screen.findByRole('button', { name: /open settings/i });
    await user.click(openSettings);

    // Reset should be disabled before autosave
    const resetBtn = screen.getByRole('button', { name: /reset checkpoint/i });
    expect(resetBtn).toBeDisabled();

    // Wait until the tower has been placed by the harness
    await waitFor(() => expect(screen.getByTestId('towers')).toHaveTextContent('1'));

    // Trigger wave start (this causes autosave in the provider)
    await user.click(screen.getByRole('button', { name: /trigger wave start/i }));

    // Confirm autosave wrote to localStorage
    await waitFor(() => expect(localStorage.getItem('nd3d.checkpoint.v1')).toBeTruthy());

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset checkpoint/i })).not.toBeDisabled();
    });
  });

  it('can validate and apply a migrated checkpoint', async () => {
    const user = userEvent.setup();

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <GameProvider>
        <Harness open={true} />
      </GameProvider>,
    );

    const sample = {
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      settings: { quality: 'low' },
      ui: {
        currentMapIndex: 0,
        money: 200,
        lives: 20,
        totalEarned: 0,
        totalSpent: 0,
        totalDamageDealt: 0,
        totalCurrencyEarned: 0,
        researchPoints: 0,
        upgrades: {},
      },
      checkpoint: {
        waveToStart: 1,
        towers: [{ type: TowerType.Basic, level: 1, x: 0, z: 0 }],
      },
    };

    const importArea = screen.getByLabelText(/import checkpoint json/i);

    await user.clear(importArea);
    await user.click(importArea);
    await user.paste(JSON.stringify(sample));

    await user.click(screen.getByRole('button', { name: /validate/i }));

    await waitFor(() => {
      expect(screen.getByText(/save validated and ready to apply/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^apply$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('playing');
      expect(screen.getByTestId('towers')).toHaveTextContent('1');
    });
  });

  it('apply cancelled by user does not change the current run', async () => {
    const user = userEvent.setup();

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <GameProvider>
        <Harness open={true} />
      </GameProvider>,
    );

    const sample = {
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      settings: { quality: 'low' },
      ui: {
        currentMapIndex: 0,
        money: 200,
        lives: 20,
        totalEarned: 0,
        totalSpent: 0,
        totalDamageDealt: 0,
        totalCurrencyEarned: 0,
        researchPoints: 0,
        upgrades: {},
      },
      checkpoint: {
        waveToStart: 1,
        towers: [{ type: TowerType.Basic, level: 1, x: 0, z: 0 }],
      },
    };

    const importArea = screen.getByLabelText(/import checkpoint json/i);

    await user.clear(importArea);
    await user.click(importArea);
    await user.paste(JSON.stringify(sample));

    await user.click(screen.getByRole('button', { name: /validate/i }));

    await waitFor(() => {
      expect(screen.getByText(/save validated and ready to apply/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^apply$/i }));

    // Ensure nothing changed.
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('towers')).toHaveTextContent('0');
  });
});
