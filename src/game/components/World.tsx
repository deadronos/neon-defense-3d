import type { ThreeEvent } from '@react-three/fiber';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../../constants';
import { TileType } from '../../types';
import { useWorld } from '../GameState';

type Tile = { x: number; z: number; type: TileType };

const TILE_GEOMETRY = new THREE.PlaneGeometry(TILE_SIZE * 0.95, TILE_SIZE * 0.95);
const TILE_ROTATION = new THREE.Euler(-Math.PI / 2, 0, 0);

const TILE_COLORS: Record<TileType, string> = {
  [TileType.Grass]: '#0b1020',
  [TileType.Path]: '#0b3a5a',
  [TileType.Spawn]: '#5a1b1b',
  [TileType.Base]: '#3b1b5a',
};

const createGridGeometry = (width: number, height: number, tileSize: number) => {
  const positions: number[] = [];

  // Tiles are centered at (x * tileSize, z * tileSize) within the World's group.
  // Grid lines should sit on tile boundaries, so we offset by half a tile.
  const startX = -tileSize / 2;
  const startZ = -tileSize / 2;
  const endX = width * tileSize - tileSize / 2;
  const endZ = height * tileSize - tileSize / 2;

  for (let x = 0; x <= width; x += 1) {
    const px = startX + x * tileSize;
    positions.push(px, 0, startZ, px, 0, endZ);
  }

  for (let z = 0; z <= height; z += 1) {
    const pz = startZ + z * tileSize;
    positions.push(startX, 0, pz, endX, 0, pz);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
};

export const World = React.memo(() => {
  const {
    mapGrid,
    currentMapIndex,
    placeTower,
    isValidPlacement,
    selectedTower,
    gameStatus,
    setSelectedEntityId,
    renderStateRef,
  } = useWorld();
  const grassMeshRef = useRef<THREE.InstancedMesh>(null);
  const pathMeshRef = useRef<THREE.InstancedMesh>(null);
  const spawnMeshRef = useRef<THREE.InstancedMesh>(null);
  const baseMeshRef = useRef<THREE.InstancedMesh>(null);
  const hoverMeshRef = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const hoverValidColor = useMemo(() => new THREE.Color('#00ff00'), []);
  const hoverInvalidColor = useMemo(() => new THREE.Color('#ff0000'), []);

  const tilesByType = useMemo(() => {
    const grass: Tile[] = [];
    const path: Tile[] = [];
    const spawn: Tile[] = [];
    const base: Tile[] = [];

    mapGrid.forEach((row, z) => {
      row.forEach((type, x) => {
        const tile = { x, z, type };
        switch (type) {
          case TileType.Path:
            path.push(tile);
            break;
          case TileType.Spawn:
            spawn.push(tile);
            break;
          case TileType.Base:
            base.push(tile);
            break;
          case TileType.Grass:
          default:
            grass.push(tile);
            break;
        }
      });
    });

    return { grass, path, spawn, base };
  }, [mapGrid]);

  const gridGeometry = useMemo(
    () => createGridGeometry(mapGrid[0].length, mapGrid.length, TILE_SIZE),
    [mapGrid],
  );

  useEffect(() => () => gridGeometry.dispose(), [gridGeometry]);

  const syncInstances = useCallback(
    (mesh: THREE.InstancedMesh | null, tiles: Tile[]) => {
      if (!mesh) return;
      mesh.count = tiles.length;
      for (let i = 0; i < tiles.length; i += 1) {
        const tile = tiles[i];
        dummy.position.set(tile.x * TILE_SIZE, 0, tile.z * TILE_SIZE);
        dummy.rotation.copy(TILE_ROTATION);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    [dummy],
  );

  useLayoutEffect(() => {
    syncInstances(grassMeshRef.current, tilesByType.grass);
    syncInstances(pathMeshRef.current, tilesByType.path);
    syncInstances(spawnMeshRef.current, tilesByType.spawn);
    syncInstances(baseMeshRef.current, tilesByType.base);
  }, [syncInstances, tilesByType]);

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
      const tile = tiles[instanceId];
      if (!tile) return;
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
    [gameStatus, placeTower, renderStateRef, selectedTower, setSelectedEntityId],
  );

  return (
    <group
      key={`map-${currentMapIndex}`}
      position={[
        (-MAP_WIDTH * TILE_SIZE) / 2 + TILE_SIZE / 2,
        0,
        (-MAP_HEIGHT * TILE_SIZE) / 2 + TILE_SIZE / 2,
      ]}
    >
      <instancedMesh
        ref={grassMeshRef}
        args={[TILE_GEOMETRY, undefined, tilesByType.grass.length]}
        onPointerMove={handlePointerMove(tilesByType.grass)}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown(tilesByType.grass)}
      >
        <meshBasicMaterial color={TILE_COLORS[TileType.Grass]} toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={pathMeshRef}
        args={[TILE_GEOMETRY, undefined, tilesByType.path.length]}
        onPointerMove={handlePointerMove(tilesByType.path)}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown(tilesByType.path)}
      >
        <meshBasicMaterial color={TILE_COLORS[TileType.Path]} toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={spawnMeshRef}
        args={[TILE_GEOMETRY, undefined, tilesByType.spawn.length]}
        onPointerMove={handlePointerMove(tilesByType.spawn)}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown(tilesByType.spawn)}
      >
        <meshBasicMaterial color={TILE_COLORS[TileType.Spawn]} toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={baseMeshRef}
        args={[TILE_GEOMETRY, undefined, tilesByType.base.length]}
        onPointerMove={handlePointerMove(tilesByType.base)}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown(tilesByType.base)}
      >
        <meshBasicMaterial color={TILE_COLORS[TileType.Base]} toneMapped={false} />
      </instancedMesh>

      <mesh
        ref={hoverMeshRef}
        visible={false}
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[TILE_SIZE * 0.95, TILE_SIZE * 0.95]} />
        <meshBasicMaterial color={hoverValidColor} transparent opacity={0.35} toneMapped={false} />
      </mesh>

      <lineSegments position={[0, 0.02, 0]} geometry={gridGeometry}>
        <lineBasicMaterial color="#00f2ff" opacity={0.4} transparent />
      </lineSegments>
    </group>
  );
});
