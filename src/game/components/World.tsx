import { useFrame } from '@react-three/fiber';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../../constants';
import { TileType } from '../../types';
import { useWorld } from '../gameContexts';
import { createGridGeometry } from '../geometry/grid';
import { useTileHover } from '../hooks/useTileHover';
import { createTileMaterial, createGridMaterial } from '../render/tileShaders';

type Tile = { x: number; z: number; type: TileType };

const TILE_GEOMETRY = new THREE.PlaneGeometry(TILE_SIZE * 0.95, TILE_SIZE * 0.95);
// Expand bounding sphere to ensure checking the bounding sphere doesn't cull instances far from origin
// The map is at most MAP_WIDTH/HEIGHT * TILE_SIZE. A radius of 100 covers everything comfortably.
TILE_GEOMETRY.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 100);
const TILE_ROTATION = new THREE.Euler(-Math.PI / 2, 0, 0);

const TILE_COLORS: Record<TileType, string> = {
  [TileType.Grass]: '#0b1020',
  [TileType.Path]: '#0b3a5a',
  [TileType.Spawn]: '#5a1b1b',
  [TileType.Base]: '#3b1b5a',
};

// eslint-disable-next-line max-lines-per-function
export const World = React.memo(() => {
  const { mapGrid, currentMapIndex } = useWorld();

  const grassMeshRef = useRef<THREE.InstancedMesh>(null);
  const pathMeshRef = useRef<THREE.InstancedMesh>(null);
  const spawnMeshRef = useRef<THREE.InstancedMesh>(null);
  const baseMeshRef = useRef<THREE.InstancedMesh>(null);

  const gridMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const grassMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const pathMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const spawnMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const baseMaterialRef = useRef<THREE.ShaderMaterial>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Use the extracted hook for hover and interaction logic
  const { hoverMeshRef, handlePointerMove, handlePointerOut, handlePointerDown, hoverValidColor } =
    useTileHover();

  // Create shader materials
  const gridMaterial = useMemo(() => createGridMaterial(), []);

  const grassMaterial = useMemo(() => createTileMaterial(TILE_COLORS[TileType.Grass]), []);
  const pathMaterial = useMemo(() => createTileMaterial(TILE_COLORS[TileType.Path]), []);
  const spawnMaterial = useMemo(() => createTileMaterial(TILE_COLORS[TileType.Spawn]), []);
  const baseMaterial = useMemo(() => createTileMaterial(TILE_COLORS[TileType.Base]), []);

  // Update time uniform for animation
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (gridMaterialRef.current) {
      gridMaterialRef.current.uniforms.uTime.value = time;
    }
    if (grassMaterialRef.current) {
      grassMaterialRef.current.uniforms.uTime.value = time;
    }
    if (pathMaterialRef.current) {
      pathMaterialRef.current.uniforms.uTime.value = time;
    }
    if (spawnMaterialRef.current) {
      spawnMaterialRef.current.uniforms.uTime.value = time;
    }
    if (baseMaterialRef.current) {
      baseMaterialRef.current.uniforms.uTime.value = time;
    }
  });

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      gridMaterial.dispose();
      grassMaterial.dispose();
      pathMaterial.dispose();
      spawnMaterial.dispose();
      baseMaterial.dispose();
    };
  }, [gridMaterial, grassMaterial, pathMaterial, spawnMaterial, baseMaterial]);

  const tilesByType = useMemo(() => {
    const grass: Tile[] = [];
    const path: Tile[] = [];
    const spawn: Tile[] = [];
    const base: Tile[] = [];

    for (const [z, row] of mapGrid.entries()) {
      for (const [x, type] of row.entries()) {
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
      }
    }

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
        args={[TILE_GEOMETRY, grassMaterial, tilesByType.grass.length]}
        material={grassMaterial}
        frustumCulled={false}
        onPointerMove={handlePointerMove(tilesByType.grass)}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown(tilesByType.grass)}
      >
        <primitive object={grassMaterial} attach="material" ref={grassMaterialRef} />
      </instancedMesh>

      <instancedMesh
        ref={pathMeshRef}
        args={[TILE_GEOMETRY, pathMaterial, tilesByType.path.length]}
        material={pathMaterial}
        frustumCulled={false}
        onPointerMove={handlePointerMove(tilesByType.path)}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown(tilesByType.path)}
      >
        <primitive object={pathMaterial} attach="material" ref={pathMaterialRef} />
      </instancedMesh>

      <instancedMesh
        ref={spawnMeshRef}
        args={[TILE_GEOMETRY, spawnMaterial, tilesByType.spawn.length]}
        material={spawnMaterial}
        frustumCulled={false}
        onPointerMove={handlePointerMove(tilesByType.spawn)}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown(tilesByType.spawn)}
      >
        <primitive object={spawnMaterial} attach="material" ref={spawnMaterialRef} />
      </instancedMesh>

      <instancedMesh
        ref={baseMeshRef}
        args={[TILE_GEOMETRY, baseMaterial, tilesByType.base.length]}
        material={baseMaterial}
        frustumCulled={false}
        onPointerMove={handlePointerMove(tilesByType.base)}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown(tilesByType.base)}
      >
        <primitive object={baseMaterial} attach="material" ref={baseMaterialRef} />
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

      <lineSegments position={[0, 0.02, 0]} geometry={gridGeometry} material={gridMaterial}>
        <primitive object={gridMaterial} attach="material" ref={gridMaterialRef} />
      </lineSegments>
    </group>
  );
});
