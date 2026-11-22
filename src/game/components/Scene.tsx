import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import React from 'react';
import * as THREE from 'three';

import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../../constants';
import { useGameUi } from '../gameContexts';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { RogueliteManager } from '../RogueliteManager';
import { StarField } from '../StarField';

import { InstancedExplosions } from './Effects';
import { InstancedEnemies } from './Enemies';
import { GameLoopBridge } from './GameLoop';
import { InstancedTowers } from './InstancedTowers';
import { InstancedProjectiles } from './Projectiles';
import { SynergyLinks } from './SynergyLinks'; // New import
// import { Tower } from './Tower'; // Keep for ref? No, replacing usage.
import { InstancedTrails } from './Trails';
import { World } from './World';

export const SceneContent = () => {
  const { removeEffect, gameState } = useGameUi();
  const reducedMotion = usePrefersReducedMotion();
  const isHigh = gameState.graphicsQuality === 'high';
  const chromaticOffset = React.useMemo(() => new THREE.Vector2(0.002, 0.002), []);

  const offsetX = (-MAP_WIDTH * TILE_SIZE) / 2 + TILE_SIZE / 2;
  const offsetZ = (-MAP_HEIGHT * TILE_SIZE) / 2 + TILE_SIZE / 2;

  return (
    <>
      <StarField count={isHigh ? 3000 : 1200} />

      <GameLoopBridge />
      <RogueliteManager />

      <World />

      <group position={[offsetX, 0, offsetZ]}>
        <SynergyLinks />
        <InstancedTowers />
        {isHigh ? <InstancedTrails /> : null}
        <InstancedEnemies />
        <InstancedProjectiles />
        <InstancedExplosions remove={removeEffect} />
      </group>

      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.5}
        minDistance={10}
        maxDistance={50}
      />

      {/* Post Processing */}
      {isHigh ? (
        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.6} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          {!reducedMotion && (
            <ChromaticAberration
              offset={chromaticOffset}
              radialModulation={false}
              modulationOffset={0}
            />
          )}
        </EffectComposer>
      ) : null}
    </>
  );
};
