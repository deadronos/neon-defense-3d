import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { GameLoopBridge } from '../../game/components/GameLoop';
import { useGame, useRenderState } from '../../game/gameContexts';
import { GameProvider } from '../../game/GameState';
import { TowerType } from '../../types';

let frame: (state: { clock: { elapsedTime: number } }, delta: number) => void;
vi.mock('@react-three/fiber', () => ({
  useFrame: (callback: typeof frame) => {
    frame = callback;
  },
}));
vi.mock('../../game/audio/useAudio', () => ({
  useAudio: () => ({ playSFX: vi.fn() }),
}));

function runCombat(speed: number) {
  const { result, unmount } = renderHook(
    () => {
      GameLoopBridge();
      return { game: useGame(), renderState: useRenderState() };
    },
    { wrapper: GameProvider },
  );

  act(() => result.current.game.startGame());
  act(() => {
    result.current.game.placeTower(0, 0, TowerType.Basic);
    result.current.game.skipWave();
    result.current.game.setGameSpeed(speed);
  });

  const shotTimes = new Set<number>();
  act(() => {
    for (let i = 1; i <= 480 / speed; i += 1) {
      frame({ clock: { elapsedTime: i / 60 } }, 1 / 60);
      const lastFired = result.current.renderState.current.towers[0]?.lastFired;
      if (lastFired) shotTimes.add(lastFired);
    }
  });

  const { enemies, towers } = result.current.renderState.current;
  const outcome = { shotTimes: [...shotTimes], enemies, towers };
  unmount();
  return outcome;
}

it('preserves tower cadence and combat outcomes at 1x, 2x and 4x', () => {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.25);
  try {
    const normal = runCombat(1);
    expect(normal.shotTimes.length).toBeGreaterThan(1);
    expect(runCombat(2)).toEqual(normal);
    expect(runCombat(4)).toEqual(normal);
  } finally {
    random.mockRestore();
  }
});

it('freezes the simulation at zero speed and advances it again after resuming', () => {
  const { result } = renderHook(
    () => {
      GameLoopBridge();
      return useGame();
    },
    { wrapper: GameProvider },
  );

  act(() => result.current.startGame());
  act(() => frame({ clock: { elapsedTime: 0.1 } }, 0.1));
  act(() => result.current.setGameSpeed(0));
  const waveBefore = result.current.waveState;
  act(() => frame({ clock: { elapsedTime: 1 } }, 0.2));
  expect(result.current.waveState).toEqual(waveBefore);
  act(() => result.current.setGameSpeed(2));
  act(() => frame({ clock: { elapsedTime: 2 } }, 0.2));
  expect(result.current.waveState?.timer).toBeLessThan(waveBefore?.timer ?? 0);
});
