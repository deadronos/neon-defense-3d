import { act, render } from '@testing-library/react';
import { Profiler, useLayoutEffect } from 'react';
import { expect, it, vi } from 'vitest';

import { UI } from '../../components/UI';
import type * as TopBarModule from '../../components/ui/TopBar';
import { useGameUi, useRenderState } from '../../game/gameContexts';
import { GameProvider } from '../../game/GameState';

const renderCounts = vi.hoisted(() => ({ provider: vi.fn(), topBar: vi.fn() }));
vi.mock('../../game/audio/useAudio', () => ({
  useAudio: () => {
    renderCounts.provider();
    return { playSFX: vi.fn() };
  },
}));
vi.mock('../../components/ui/TopBar', async (importOriginal) => {
  const { TopBar } = await importOriginal<typeof TopBarModule>();
  return {
    TopBar: (props: Parameters<typeof TopBar>[0]) => {
      renderCounts.topBar();
      return <TopBar {...props} />;
    },
  };
});

it('moves enemies without committing UI or rendering the provider during steady ticks', () => {
  const uiCommits = vi.fn();
  let controls!: ReturnType<typeof useGameUi>;
  let renderState!: ReturnType<typeof useRenderState>;
  function Controls() {
    const ui = useGameUi();
    const state = useRenderState();
    useLayoutEffect(() => {
      controls = ui;
      renderState = state;
    }, [ui, state]);
    return null;
  }
  render(
    <GameProvider>
      <Controls />
      <Profiler id="UI" onRender={uiCommits}>
        <UI />
      </Profiler>
    </GameProvider>,
  );

  act(() => controls.startGame());
  act(() => controls.step(1 / 60, 0));
  act(() => controls.skipWave());
  let frame = 1;
  for (; frame <= 120 && renderState.current.enemies.length === 0; frame++) {
    act(() => controls.step(1 / 60, frame / 60));
  }
  const enemy = renderState.current.enemies[0];
  expect(enemy).toBeDefined();
  const position = [...enemy.position];
  renderCounts.provider.mockClear();
  renderCounts.topBar.mockClear();
  uiCommits.mockClear();

  for (let i = 2; i <= 5; i++) {
    act(() => controls.step(1 / 60, (frame + i) / 60));
  }

  expect(renderState.current.enemies[0].position).not.toEqual(position);
  expect(renderCounts.provider).not.toHaveBeenCalled();
  expect(renderCounts.topBar).not.toHaveBeenCalled();
  expect(uiCommits).not.toHaveBeenCalled();
});
