import { Canvas } from '@react-three/fiber';
import React from 'react';
import * as THREE from 'three';

import { DynamicResScaler } from './components/DynamicResScaler';
import { SceneContent } from './components/Scene';

export const GameCanvas = () => {
  return (
    <div className="w-full h-full bg-[#03030b]">
      <Canvas
        shadows
        camera={{ position: [0, 25, 20], fov: 45 }}
        gl={{
          toneMapping: THREE.ReinhardToneMapping,
          toneMappingExposure: 1.5,
          antialias: false, // Often recommended with postprocessing to let Composer handle AA if needed, but for simple Bloom it's fine.
          // However, keeping AA on is usually better if not using SMAA in composer.
          // Let's keep defaults but be aware.
        }}
      >
        <DynamicResScaler />
        <SceneContent />
      </Canvas>
    </div>
  );
};
