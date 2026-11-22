import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UI } from '../../components/UI';
import { useGame } from '../../game/gameContexts';
import { GameProvider } from '../../game/GameState';
import { TowerType } from '../../types';

vi.mock('../../game/audio/useAudio', () => ({
  useAudio: () => ({ playSFX: vi.fn() }),
}));

function TestControls() {
  const game = useGame();
  return (
    <>
      <UI />
      <input aria-label="Typed command" />
      <output aria-label="Simulation speed">{game.gameSpeed}</output>
      <button
        type="button"
        onClick={() => {
          const tower = game.towers.at(0);
          if (tower) game.setSelectedEntityId(tower.id);
          else game.placeTower(0, 0, TowerType.Basic);
        }}
      >
        Place or inspect tower
      </button>
    </>
  );
}

async function start() {
  const user = userEvent.setup();
  render(<TestControls />, { wrapper: GameProvider });
  await user.click(screen.getByRole('button', { name: 'INITIATE' }));
  return user;
}

const speed = () => screen.getByLabelText('Simulation speed');

describe('gameplay controls', () => {
  beforeEach(() => localStorage.clear());

  it('remembers speed, resumes at a chosen speed, and handles Space', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: 'Set speed to 4x' }));
    await user.click(screen.getByRole('button', { name: 'Pause game' }));
    expect(speed()).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: 'Resume game' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.keyboard('[Space]');
    expect(speed()).toHaveTextContent('4');
    await user.keyboard('[Space]');
    await user.click(screen.getByRole('button', { name: 'Set speed to 2x' }));
    expect(speed()).toHaveTextContent('2');
  });

  it('restores Settings speed, focus, and a pre-existing pause', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: 'Set speed to 2x' }));
    const trigger = screen.getByRole('button', { name: 'Open settings' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog).toHaveFocus();
    expect(speed()).toHaveTextContent('0');
    await user.keyboard('[Space]1');
    expect(speed()).toHaveTextContent('0');
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(speed()).toHaveTextContent('2');
    await user.click(screen.getByRole('button', { name: 'Pause game' }));
    await user.click(trigger);
    await user.click(within(screen.getByRole('dialog')).getByPlaceholderText(/paste checkpoint/i));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(speed()).toHaveTextContent('0');
  });

  it('toggles affordable tower keybinds and guards editable and modified events', async () => {
    const user = await start();
    const buttons = screen.getAllByRole('button', { name: /^Select / });
    expect(buttons).toHaveLength(5);
    for (const [index, button] of buttons.entries()) {
      await user.keyboard(String(index + 1));
      const affordable = index !== 2;
      expect(button).toHaveAttribute('aria-pressed', String(affordable));
      await user.keyboard(String(index + 1));
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
    await user.keyboard('1{Escape}');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(document.body, { key: '1', ctrlKey: true });
    const input = screen.getByRole('textbox', { name: 'Typed command' });
    await user.click(input);
    await user.keyboard('1[Space]');
    expect(input).toHaveValue('1 ');
    expect(speed()).toHaveTextContent('1');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('upgrades an affordable inspected tower and shares two-step sell confirmation', async () => {
    const user = await start();
    const inspect = screen.getByRole('button', { name: 'Place or inspect tower' });
    await user.click(inspect);
    await user.click(inspect);
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeEnabled();
    await user.keyboard('u');
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: /upgrade/i })).toBeNull();
    await user.click(inspect);
    await user.keyboard('{Backspace}');
    expect(screen.getByRole('button', { name: /confirm sell/i })).toBeVisible();
    await user.keyboard('{Delete}');
    expect(screen.queryByRole('button', { name: /upgrade/i })).toBeNull();
  });
});

it('traps keyboard focus in the Tech Lab and returns it after backdrop or Escape dismissal', async () => {
  const user = userEvent.setup();
  render(<UI />, { wrapper: GameProvider });
  const trigger = screen.getByRole('button', { name: /research lab/i });
  await user.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Tech Lab' });
  const first = within(dialog).getByRole('button', { name: 'Close' });
  const last = within(dialog).getByText('CLOSE');
  expect(dialog).toHaveFocus();
  await user.tab({ shift: true });
  expect(last).toHaveFocus();
  await user.tab();
  expect(first).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  const backdrop = screen.getByRole('dialog').parentElement;
  expect(backdrop).not.toBeNull();
  if (backdrop) await user.click(backdrop);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(trigger).toHaveFocus();
});
