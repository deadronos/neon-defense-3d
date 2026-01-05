import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
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

// Vertex shader for pulsating grid lines
const gridVertexShader = `
  varying vec3 vPosition;
  
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader for pulsating grid lines
const gridFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vPosition;
  
  void main() {
    // Create a slow pulse effect (period ~3 seconds)
    float pulse = sin(uTime * 2.0) * 0.3 + 0.7;
    
    // Add subtle position-based variation
    float posVariation = sin(vPosition.x * 0.5 + vPosition.z * 0.5 + uTime) * 0.15 + 0.85;
    
    // Combine pulse and variation
    float finalOpacity = uOpacity * pulse * posVariation;
    
    // Add slight color shift for more "alive" feeling
    vec3 finalColor = uColor * (0.9 + pulse * 0.2);
    
    gl_FragColor = vec4(finalColor, finalOpacity);
  }
`;

// Vertex shader for pulsating tiles
const tileVertexShader = `
  varying vec3 vPosition;
  
  void main() {
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader for pulsating tiles
const tileFragmentShader = `
  uniform float uTime;
  uniform vec3 uBaseColor;
  varying vec3 vPosition;
  
  void main() {
    // Very subtle pulse (period ~4 seconds)
    float pulse = sin(uTime * 1.5) * 0.08 + 0.92;
    
    // Add minimal brightness variation
    vec3 finalColor = uBaseColor * pulse;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

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
  const gridMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const grassMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const pathMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const spawnMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const baseMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const hoverValidColor = useMemo(() => new THREE.Color('#00ff00'), []);
  const hoverInvalidColor = useMemo(() => new THREE.Color('#ff0000'), []);

  // Create shader materials with time uniforms
  const gridMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#00f2ff') },
          uOpacity: { value: 0.4 },
        },
        vertexShader: gridVertexShader,
        fragmentShader: gridFragmentShader,
        transparent: true,
      }),
    [],
  );

  const createTileMaterial = useCallback((color: string) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color(color) },
      },
      vertexShader: tileVertexShader,
      fragmentShader: tileFragmentShader,
      toneMapped: false,
    });
  }, []);

  const grassMaterial = useMemo(
    () => createTileMaterial(TILE_COLORS[TileType.Grass]),
    [createTileMaterial],
  );
  const pathMaterial = useMemo(
    () => createTileMaterial(TILE_COLORS[TileType.Path]),
    [createTileMaterial],
  );
  const spawnMaterial = useMemo(
    () => createTileMaterial(TILE_COLORS[TileType.Spawn]),
    [createTileMaterial],
  );
  const baseMaterial = useMemo(
    () => createTileMaterial(TILE_COLORS[TileType.Base]),
    [createTileMaterial],
  );

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
        args={[TILE_GEOMETRY, grassMaterial, tilesByType.grass.length]}
        material={grassMaterial}
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
