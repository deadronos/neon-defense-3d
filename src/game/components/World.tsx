import React, { useState } from 'react';
import * as THREE from 'three';

import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../../constants';
import { TileType } from '../../types';
import { useGame } from '../GameState';

const GRID_PLANE_GEO = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);

export const Tile: React.FC<{ x: number; z: number; type: TileType }> = ({ x, z, type }) => {
  const { placeTower, selectedTower, isValidPlacement, gameState, setSelectedEntityId, towers } =
    useGame();
  const [hovered, setHovered] = useState(false);

  let color = '#000000';
  let emissive = '#000000';
  let emissiveIntensity = 0;

  if (type === TileType.Path) {
    color = '#001133';
    emissive = '#0088ff';
    emissiveIntensity = 0.5;
  } else if (type === TileType.Spawn) {
    color = '#330000';
    emissive = '#ff0000';
    emissiveIntensity = 0.8;
  } else if (type === TileType.Base) {
    color = '#110033';
    emissive = '#ff00ff';
    emissiveIntensity = 0.8;
  } else {
    // Grass / Empty
    color = '#050510';
  }

  if (hovered && selectedTower && type === TileType.Grass && gameState.gameStatus === 'playing') {
    const valid = isValidPlacement(x, z);
    color = valid ? '#003300' : '#330000';
    emissive = valid ? '#00ff00' : '#ff0000';
    emissiveIntensity = 0.5;
  }

  return (
    <group position={[x * TILE_SIZE, 0, z * TILE_SIZE]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (gameState.gameStatus !== 'playing') return;

          // Check if there's a tower here
          const existingTower = towers.find((t) => t.gridPos[0] === x && t.gridPos[1] === z);

          if (existingTower) {
            setSelectedEntityId(existingTower.id);
            return;
          }

          if (selectedTower) {
            placeTower(x, z, selectedTower);
          } else {
            setSelectedEntityId(null);
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[TILE_SIZE * 0.95, TILE_SIZE * 0.95]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      {/* Grid Floor Overlay */}
      <lineSegments position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[GRID_PLANE_GEO]} />
        <lineBasicMaterial color="#00f2ff" opacity={0.5} transparent />
      </lineSegments>
    </group>
  );
};

export const World = () => {
  const { mapGrid } = useGame();
  return (
    <group
      position={[
        (-MAP_WIDTH * TILE_SIZE) / 2 + TILE_SIZE / 2,
        0,
        (-MAP_HEIGHT * TILE_SIZE) / 2 + TILE_SIZE / 2,
      ]}
    >
      {mapGrid.map((row, z) =>
        row.map((type, x) => <Tile key={`${x}-${z}`} x={x} z={z} type={type} />),
      )}
    </group>
  );
};
