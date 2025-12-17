import { OrbitControls, SoftShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import React from 'react';
import * as THREE from 'three';

import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../../constants';
import { useGame } from '../GameState';
import { StarField } from '../StarField';

import { InstancedExplosions } from './Effects';
import { InstancedEnemies } from './Enemies';
import { GameLoopBridge } from './GameLoop';
import { InstancedProjectiles } from './Projectiles';
import { Tower } from './Tower';
import { InstancedTrails } from './Trails';
import { World } from './World';

export const SceneContent = () => {
  const { enemies, towers, projectiles, effects, removeEffect } = useGame();

  const offsetX = (-MAP_WIDTH * TILE_SIZE) / 2 + TILE_SIZE / 2;
  const offsetZ = (-MAP_HEIGHT * TILE_SIZE) / 2 + TILE_SIZE / 2;

  return (
    <>
      <StarField count={3000} />

      {/* Dark Ambient & Rim Lighting */}
      <ambientLight intensity={0.1} />
      <directionalLight position={[-10, 20, -10]} intensity={0.5} color="#4444ff" />
      <directionalLight position={[10, 5, 10]} intensity={0.5} color="#ff00ff" />

      <GameLoopBridge />

      <World />

      <group position={[offsetX, 0, offsetZ]}>
        {towers.map((t) => (
          <Tower key={t.id} data={t} enemies={enemies} />
        ))}
        <InstancedTrails enemies={enemies} />
        <InstancedEnemies enemies={enemies} />
        <InstancedProjectiles projectiles={projectiles} enemies={enemies} />
        {effects.length > 0 && <InstancedExplosions effects={effects} remove={removeEffect} />}
      </group>

      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.5}
        minDistance={10}
        maxDistance={50}
      />

      <SoftShadows size={10} samples={8} />

      {/* Post Processing */}
      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.6} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        <ChromaticAberration
          offset={new THREE.Vector2(0.002, 0.002)}
          radialModulation={false}
          modulationOffset={0}
        />
      </EffectComposer>
    </>
  );
};
