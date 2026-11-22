import { renderHook } from '@testing-library/react';
import * as THREE from 'three';
import { expect, it, vi } from 'vitest';

import { useInstancedUpdater } from '../../game/components/instancing/useInstancedUpdater';
import { createInitialRenderState } from '../../game/renderStateUtils';

const fixture = vi.hoisted(() => ({
  frame: undefined as ((state: { clock: { getElapsedTime: () => number } }) => void) | undefined,
}));

vi.mock('@react-three/fiber', () => ({
  useFrame: (frame: typeof fixture.frame) => {
    fixture.frame = frame;
  },
}));
vi.mock('../../game/gameContexts', () => ({
  useRenderState: () => ({ current: createInitialRenderState() }),
}));

it('keeps mesh refs stable and skips buffer uploads once instance count reaches zero', () => {
  let entities = [1];
  const { result, rerender } = renderHook(() =>
    useInstancedUpdater(() => entities, {
      count: 4,
      meshKeys: ['main'],
      updateInstance: vi.fn(),
    }),
  );
  const setMesh = result.current.setMeshRef('main');
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, 4);
  try {
    setMesh(mesh);
    const instanceColor = mesh.instanceColor;
    expect(instanceColor).not.toBeNull();
    rerender();
    expect(result.current.setMeshRef('main')).toBe(setMesh);

    const state = { clock: { getElapsedTime: () => 1 } };
    fixture.frame?.(state);
    expect(mesh.count).toBe(1);
    expect(mesh.instanceMatrix.version).toBeGreaterThan(0);
    const matrixVersion = mesh.instanceMatrix.version;
    const colorVersion = instanceColor?.version;

    entities = [];
    fixture.frame?.(state);
    expect(mesh.count).toBe(0);
    fixture.frame?.(state);
    expect(mesh.instanceMatrix.version).toBe(matrixVersion);
    expect(mesh.instanceColor).toBe(instanceColor);
    expect(instanceColor?.version).toBe(colorVersion);
  } finally {
    mesh.dispose();
    material.dispose();
    geometry.dispose();
  }
});
