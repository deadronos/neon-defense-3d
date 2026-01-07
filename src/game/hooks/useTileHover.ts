import { useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { TileType } from '../../types';
import { useWorld } from '../gameContexts';
import { TILE_SIZE } from '../../constants';

type Tile = { x: number; z: number; type: TileType };

export const useTileHover = () => {
  const {
    placeTower,
    isValidPlacement,
    selectedTower,
    gameStatus,
    setSelectedEntityId,
    renderStateRef,
  } = useWorld();

  const hoverMeshRef = useRef<THREE.Mesh>(null);
  const hoverValidColor = useMemo(() => new THREE.Color('#00ff00'), []);
  const hoverInvalidColor = useMemo(() => new THREE.Color('#ff0000'), []);

  const hideHover = useCallback(() => {
    if (hoverMeshRef.current) {
      hoverMeshRef.current.visible = false;
    }
  }, []);

  const showHover = useCallback(
    (tile: Tile, valid: boolean) => {
      if (!hoverMeshRef.current) return;
      hoverMeshRef.current.visible = true;
      hoverMeshRef.current.position.set(tile.x * TILE_SIZE, 0.01, tile.z * TILE_SIZE);
      const material = hoverMeshRef.current.material as THREE.MeshBasicMaterial;
      material.color.copy(valid ? hoverValidColor : hoverInvalidColor);
    },
    [hoverInvalidColor, hoverValidColor],
  );

  const handlePointerMove = useCallback(
    (tiles: Tile[]) => (event: ThreeEvent<PointerEvent>) => {
      const instanceId = event.instanceId;
      if (instanceId === undefined) return;
      const tile = tiles.at(instanceId);
      if (tile === undefined) return;
      if (selectedTower && tile.type === TileType.Grass && gameStatus === 'playing') {
        const valid = isValidPlacement(tile.x, tile.z);
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

      const key = `${tile.x},${tile.z}`;
      const existingTower = renderStateRef.current.gridOccupancy.get(key);

      if (existingTower) {
        setSelectedEntityId(existingTower.id);
        return;
      }

      if (selectedTower) {
        placeTower(tile.x, tile.z, selectedTower);
      } else {
        setSelectedEntityId(null);
      }
    },
    [gameStatus, placeTower, renderStateRef, selectedTower, setSelectedEntityId],
  );

  return {
    hoverMeshRef,
    handlePointerMove,
    handlePointerOut,
    handlePointerDown,
    hoverValidColor,
  };
};
