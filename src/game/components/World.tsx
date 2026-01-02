import type { ThreeEvent } from '@react-three/fiber';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../../constants';
import { TileType } from '../../types';
import { useWorld } from '../GameState';

import { ensureInstanceColor } from './instancing/instancedUtils';

const TILE_GEOMETRY = new THREE.PlaneGeometry(TILE_SIZE * 0.95, TILE_SIZE * 0.95);
const TILE_ROTATION = new THREE.Euler(-Math.PI / 2, 0, 0);

const getTileBaseColor = (type: TileType) => {
  if (type === TileType.Path) return '#0b3a5a';
  if (type === TileType.Spawn) return '#5a1b1b';
  if (type === TileType.Base) return '#3b1b5a';
  return '#0b1020';
};

const createGridGeometry = (width: number, height: number, tileSize: number) => {
  const positions: number[] = [];
  const maxX = width * tileSize;
  const maxZ = height * tileSize;

  for (let x = 0; x <= width; x += 1) {
    const px = x * tileSize;
    positions.push(px, 0, 0, px, 0, maxZ);
  }

  for (let z = 0; z <= height; z += 1) {
    const pz = z * tileSize;
    positions.push(0, 0, pz, maxX, 0, pz);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
};

export const World = React.memo(() => {
  const {
    mapGrid,
    placeTower,
    isValidPlacement,
    selectedTower,
    gameStatus,
    setSelectedEntityId,
    renderStateRef,
  } = useWorld();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const hoveredIdRef = useRef<number | null>(null);
  const hoverValidColor = useMemo(() => new THREE.Color('#00ff00'), []);
  const hoverInvalidColor = useMemo(() => new THREE.Color('#ff0000'), []);

  const tiles = useMemo(
    () =>
      mapGrid.flatMap((row, z) =>
        row.map((type, x) => ({
          x,
          z,
          type,
        })),
      ),
    [mapGrid],
  );

  const baseColors = useMemo(
    () => tiles.map((tile) => new THREE.Color(getTileBaseColor(tile.type))),
    [tiles],
  );

  const gridGeometry = useMemo(
    () => createGridGeometry(mapGrid[0].length, mapGrid.length, TILE_SIZE),
    [mapGrid],
  );

  useEffect(() => () => gridGeometry.dispose(), [gridGeometry]);

  const setInstanceColor = useCallback((index: number, color: THREE.Color) => {
    if (!meshRef.current) return;
    meshRef.current.setColorAt(index, color);
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  const resetHover = useCallback(() => {
    if (hoveredIdRef.current === null) return;
    setInstanceColor(hoveredIdRef.current, baseColors[hoveredIdRef.current]);
    hoveredIdRef.current = null;
  }, [baseColors, setInstanceColor]);

  const applyHover = useCallback(
    (index: number) => {
      const tile = tiles[index];
      if (!tile) return;
      if (selectedTower && tile.type === TileType.Grass && gameStatus === 'playing') {
        const valid = isValidPlacement(tile.x, tile.z);
        setInstanceColor(index, valid ? hoverValidColor : hoverInvalidColor);
        return;
      }
      setInstanceColor(index, baseColors[index]);
    },
    [
      baseColors,
      gameStatus,
      hoverInvalidColor,
      hoverValidColor,
      isValidPlacement,
      selectedTower,
      setInstanceColor,
      tiles,
    ],
  );

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.count = tiles.length;
    ensureInstanceColor(meshRef.current, tiles.length);

    for (let i = 0; i < tiles.length; i += 1) {
      const tile = tiles[i];
      dummy.position.set(tile.x * TILE_SIZE, 0, tile.z * TILE_SIZE);
      dummy.rotation.copy(TILE_ROTATION);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, baseColors[i]);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [baseColors, dummy, tiles]);

  useEffect(() => {
    if (hoveredIdRef.current === null) return;
    applyHover(hoveredIdRef.current);
  }, [applyHover]);

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const instanceId = event.instanceId;
      if (instanceId === undefined) return;
      if (hoveredIdRef.current === instanceId) return;
      resetHover();
      hoveredIdRef.current = instanceId;
      applyHover(instanceId);
    },
    [applyHover, resetHover],
  );

  const handlePointerOut = useCallback(() => {
    resetHover();
  }, [resetHover]);

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const instanceId = event.instanceId;
      if (instanceId === undefined) return;
      const tile = tiles[instanceId];
      if (!tile) return;
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
    [gameStatus, placeTower, renderStateRef, selectedTower, setSelectedEntityId, tiles],
  );

  return (
    <group
      position={[
        (-MAP_WIDTH * TILE_SIZE) / 2 + TILE_SIZE / 2,
        0,
        (-MAP_HEIGHT * TILE_SIZE) / 2 + TILE_SIZE / 2,
      ]}
    >
      <instancedMesh
        ref={meshRef}
        args={[TILE_GEOMETRY, undefined, tiles.length]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
      >
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>

      <lineSegments position={[0, 0.02, 0]} geometry={gridGeometry}>
        <lineBasicMaterial color="#00f2ff" opacity={0.4} transparent />
      </lineSegments>
    </group>
  );
});
