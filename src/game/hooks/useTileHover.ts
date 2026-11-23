import type { ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

import { TILE_SIZE } from '../../constants';
import { TileType } from '../../types';
import { gridKey } from '../../utils/gridKey';
import { useWorld } from '../gameContexts';
import { canLinkTowers } from '../synergies';
import { getTowerStats } from '../utils';

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

type Tile = { x: number; z: number; type: TileType };

export const useTileHover = () => {
  const {
    upgrades,
    placeTower,
    isValidPlacement,
    selectedTower,
    gameStatus,
    setSelectedEntityId,
    renderStateRef,
  } = useWorld();

  const previewRef = useRef<THREE.Group>(null);
  const rangeRef = useRef<THREE.Mesh>(null);
  const range = useMemo(
    () => (selectedTower ? getTowerStats(selectedTower, 1, { upgrades }).range : 0),
    [selectedTower, upgrades],
  );
  const hoverMeshRef = useRef<THREE.Mesh>(null);
  const invalidMarkerRef = useRef<THREE.Group>(null);
  const hoverValidColor = useMemo(() => new THREE.Color('#00ff00'), []);
  const hoverInvalidColor = useMemo(() => new THREE.Color('#ff0000'), []);

  const hideHover = useCallback(() => {
    if (previewRef.current) previewRef.current.visible = false;
    if (hoverMeshRef.current) {
      hoverMeshRef.current.visible = false;
    }
  }, []);

  useEffect(() => {
    hideHover();
  }, [hideHover, selectedTower, gameStatus]);

  const showHover = useCallback(
    (tile: Tile, valid: boolean) => {
      if (!hoverMeshRef.current) return;
      hoverMeshRef.current.visible = true;
      hoverMeshRef.current.position.set(tile.x * TILE_SIZE, 0.01, tile.z * TILE_SIZE);
      const material = hoverMeshRef.current.material as THREE.MeshBasicMaterial;
      if (invalidMarkerRef.current) invalidMarkerRef.current.visible = !valid;
      material.color.copy(valid ? hoverValidColor : hoverInvalidColor);

      const preview = previewRef.current;
      if (!preview) return;
      preview.visible = valid && !!selectedTower;
      if (!preview.visible || !selectedTower) return;
      preview.position.set(tile.x * TILE_SIZE, 0.05, tile.z * TILE_SIZE);
      rangeRef.current?.scale.set(range, range, 1);
      for (let index = 0; index < NEIGHBORS.length; index += 1) {
        const [dx, dz] = NEIGHBORS[index];
        const partner = renderStateRef.current.gridOccupancy.get(gridKey(tile.x + dx, tile.z + dz));
        const link = preview.children[index + 1];
        link.visible = !!partner && canLinkTowers(selectedTower, partner.type);
        link.position.set((dx * TILE_SIZE) / 2, 0.025, (dz * TILE_SIZE) / 2);
        link.rotation.y = Math.atan2(dx, dz);
      }
    },
    [hoverInvalidColor, hoverValidColor, range, renderStateRef, selectedTower],
  );

  const handlePointerMove = useCallback(
    (tiles: Tile[]) => (event: ThreeEvent<PointerEvent>) => {
      const instanceId = event.instanceId;
      if (instanceId === undefined) return;
      const tile = tiles.at(instanceId);
      if (tile === undefined) return;
      if (selectedTower && gameStatus === 'playing') {
        const valid = tile.type === TileType.Grass && isValidPlacement(tile.x, tile.z);
        showHover(tile, valid);
        return;
      }
      hideHover();
    },
    [gameStatus, hideHover, isValidPlacement, selectedTower, showHover],
  );

  const handlePointerOut = useCallback(() => {
    hideHover();
  }, [hideHover]);

  const handlePointerDown = useCallback(
    (tiles: Tile[]) => (event: ThreeEvent<PointerEvent>) => {
      const instanceId = event.instanceId;
      if (instanceId === undefined) return;
      const tile = tiles.at(instanceId);
      if (tile === undefined) return;
      if (gameStatus !== 'playing') return;

      const key = gridKey(tile.x, tile.z);
      const existingTower = renderStateRef.current.gridOccupancy.get(key);

      if (existingTower) {
        setSelectedEntityId(existingTower.id);
        return;
      }

      if (selectedTower) {
        placeTower(tile.x, tile.z, selectedTower);
        hideHover();
      } else {
        setSelectedEntityId(null);
      }
    },
    [gameStatus, hideHover, placeTower, renderStateRef, selectedTower, setSelectedEntityId],
  );

  return {
    previewRef,
    rangeRef,
    hoverMeshRef,
    invalidMarkerRef,
    handlePointerMove,
    handlePointerOut,
    handlePointerDown,
    hoverValidColor,
  };
};
