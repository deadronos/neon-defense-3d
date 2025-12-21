import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useEffect, useMemo } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { SettingsModal } from '../../components/ui/SettingsModal';
import { GameProvider, useGame } from '../../game/GameState';
import type { Vector2 } from '../../types';
import { TileType, TowerType } from '../../types';

const findFirstBuildableSpot = (grid: TileType[][]): Vector2 | null => {
  for (let z = 0; z < grid.length; z++) {
    for (let x = 0; x < grid[0]!.length; x++) {
      if (grid[z]![x] === TileType.Grass) return [x, z];
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

const AutosaveHarness = () => {
  const game = useGame();

  const firstSpot = useMemo(() => findFirstBuildableSpot(game.mapGrid), [game.mapGrid]);

  useEffect(() => {
    game.startGame();
  }, [game]);

  useEffect(() => {
    if (game.gameState.gameStatus !== 'playing') return;
    if (!firstSpot) return;

    // Ensure a tower exists before wave 1 starts so autosave has something to include.
    game.placeTower(firstSpot[0], firstSpot[1], TowerType.Basic);
  }, [game, firstSpot, game.gameState.gameStatus]);

  return (
    <>
      <div data-testid="status">{game.gameState.gameStatus}</div>
      <SettingsModal open={true} onClose={() => {}} />
      <button type="button" onClick={() => game.step(5.1, 5.1)}>
        Trigger wave start
      </button>
    </>
  );
};

describe('SettingsModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
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

    await user.type(screen.getByLabelText(/import checkpoint json/i), '{');
    await user.click(screen.getByRole('button', { name: /validate/i }));

    expect(screen.getByText(/import blocked/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^apply$/i })).toBeDisabled();

    // Ensure nothing changed.
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('towers')).toHaveTextContent('0');
  });

  it('enables Reset Checkpoint if an autosave happens while the modal is open', async () => {
    const user = userEvent.setup();

    render(
      <GameProvider>
        <AutosaveHarness />
      </GameProvider>,
    );

    const resetBtn = screen.getByRole('button', { name: /reset checkpoint/i });
    expect(resetBtn).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /trigger wave start/i }));

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

    await user.clear(screen.getByLabelText(/import checkpoint json/i));
    await user.paste(
      screen.getByLabelText(/import checkpoint json/i),
      JSON.stringify(sample),
    );

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
});
