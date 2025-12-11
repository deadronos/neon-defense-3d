import { Canvas } from '@react-three/fiber';
import React from 'react';
import * as THREE from 'three';

import { SceneContent } from './components/Scene';

export const GameCanvas = () => {
  return (
    <div className="w-full h-full bg-[#03030b]">
      <Canvas
        shadows
        camera={{ position: [0, 25, 20], fov: 45 }}
        gl={{ toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
};
