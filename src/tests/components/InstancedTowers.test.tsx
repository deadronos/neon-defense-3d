import { render } from '@testing-library/react';
import { InstancedMesh, Matrix4, Object3D, Quaternion, Vector3 } from 'three';
import { expect, it, vi } from 'vitest';

import { TOWER_CONFIGS } from '../../constants';
import { InstancedTowers } from '../../game/components/InstancedTowers';
import type { InstancedUpdaterOptions } from '../../game/components/instancing/useInstancedUpdater';
import type { EngineTower } from '../../game/engine/types';
import { createInitialRenderState, syncRenderState } from '../../game/renderStateUtils';
import { createInitialRuntimeState } from '../../game/stores/runtimeReducer';
import { SynergyType, TowerType, type TowerEntity } from '../../types';

let updateInstance: InstancedUpdaterOptions<TowerEntity>['updateInstance'];
const renderState = createInitialRenderState();

vi.mock('../../game/components/instancing/useInstancedUpdater', () => ({
  useInstancedUpdater: (
    _select: (state: typeof renderState) => TowerEntity[],
    options: InstancedUpdaterOptions<TowerEntity>,
  ) => {
    updateInstance = options.updateInstance;
    return { setMeshRef: () => undefined };
  },
}));

vi.mock('../../game/gameContexts', () => ({
  useGameUi: () => ({ selectedEntityId: 'sniper', gameState: { upgrades: {} } }),
  useRenderState: () => ({ current: renderState }),
}));

it('updates the selected tower range when engine synergies are added or removed', () => {
  const tower: EngineTower = {
    id: 'sniper',
    type: TowerType.Sniper,
    gridPosition: [0, 0],
    level: 1,
    lastFired: 0,
  };
  const engine = createInitialRuntimeState().engine;
  const range = new InstancedMesh(undefined, undefined, 1);
  const dummy = new Object3D();
  const matrix = new Matrix4();
  const scale = new Vector3();
  const context = { time: 0, alpha: 0, cameraQuaternion: new Quaternion(), renderState };

  render(<InstancedTowers />);
  function drawRadius(activeSynergies: EngineTower['activeSynergies']) {
    syncRenderState({ ...engine, towers: [{ ...tower, activeSynergies }] }, renderState, {
      enemyTypeMap: new Map(),
      pathWaypoints: [],
      tileSize: 2,
    });
    updateInstance(0, renderState.towers[0], dummy, { range }, context);
    range.getMatrixAt(0, matrix);
    return scale.setFromMatrixScale(matrix).x;
  }

  const baseRange = TOWER_CONFIGS[TowerType.Sniper].range;
  expect(drawRadius([])).toBeCloseTo(baseRange);
  expect(drawRadius([{ type: SynergyType.TRIANGULATION, partnerId: 'partner' }])).toBeCloseTo(
    baseRange * 1.2,
  );
  expect(drawRadius([])).toBeCloseTo(baseRange);
});
