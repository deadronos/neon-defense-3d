import { render } from '@testing-library/react';
import { BufferGeometry } from 'three';
import { expect, it, vi } from 'vitest';

import { SynergyLinks } from '../../game/components/SynergyLinks';
import { SynergyType, TowerType, type TowerEntity } from '../../types';

let frame: (state: { clock: { elapsedTime: number } }) => void;
const renderState = { current: { towers: [] as TowerEntity[] } };

vi.mock('@react-three/fiber', () => ({
  useFrame: (callback: typeof frame) => {
    frame = callback;
  },
}));

vi.mock('../../game/gameContexts', () => ({
  useRenderState: () => renderState,
}));

it('reuses geometry across frames and rebuilds when links or towers change', () => {
  const first: TowerEntity = {
    id: 'first',
    type: TowerType.Sniper,
    gridPos: [0, 0],
    position: [0, 0.5, 0],
    lastFired: 0,
    targetId: null,
    level: 1,
    activeSynergies: [{ type: SynergyType.TRIANGULATION, partnerId: 'second' }],
  };
  const second: TowerEntity = {
    ...first,
    id: 'second',
    gridPos: [1, 0],
    position: [2, 0.5, 0],
    activeSynergies: [],
  };
  renderState.current.towers = [first, second];

  const { container } = render(<SynergyLinks />);
  const geometry = new BufferGeometry();
  const setAttribute = vi.spyOn(geometry, 'setAttribute');
  const dispose = vi.spyOn(geometry, 'dispose');
  // Supply the Three.js methods to the host ref in the DOM test renderer.
  Object.assign(container.querySelector('bufferGeometry')!, {
    setAttribute: setAttribute.bind(geometry),
    dispose: dispose.bind(geometry),
    computeBoundingSphere: geometry.computeBoundingSphere.bind(geometry),
  });

  frame({ clock: { elapsedTime: 0 } });
  expect(setAttribute).toHaveBeenCalledTimes(2);
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(geometry.getAttribute('position').count).toBe(2);
  expect(geometry.getAttribute('color').getZ(0)).toBeLessThanOrEqual(3.5);

  frame({ clock: { elapsedTime: 1 } });
  renderState.current.towers = [{ ...first, lastFired: 1 }, second];
  frame({ clock: { elapsedTime: 2 } });
  expect(setAttribute).toHaveBeenCalledTimes(2);
  expect(dispose).toHaveBeenCalledTimes(1);

  renderState.current.towers = [{ ...first, activeSynergies: [] }, second];
  frame({ clock: { elapsedTime: 3 } });
  expect(setAttribute).toHaveBeenCalledTimes(4);
  expect(dispose).toHaveBeenCalledTimes(2);
  expect(geometry.getAttribute('position').count).toBe(0);

  renderState.current.towers = [first, second];
  frame({ clock: { elapsedTime: 4 } });
  renderState.current.towers = [first];
  frame({ clock: { elapsedTime: 5 } });
  expect(setAttribute).toHaveBeenCalledTimes(8);
  expect(dispose).toHaveBeenCalledTimes(4);
  expect(geometry.getAttribute('position').count).toBe(0);
});
