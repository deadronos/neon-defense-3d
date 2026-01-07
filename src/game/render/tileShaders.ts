import * as THREE from 'three';

// Vertex shader for pulsating grid lines
export const gridVertexShader = `
  varying vec3 vPosition;

  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader for pulsating grid lines
export const gridFragmentShader = `
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
export const tileVertexShader = `
  varying vec3 vPosition;

  void main() {
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader for pulsating tiles
export const tileFragmentShader = `
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

export const createTileMaterial = (color: string): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color(color) },
    },
    vertexShader: tileVertexShader,
    fragmentShader: tileFragmentShader,
    toneMapped: false,
  });
};

export const createGridMaterial = (): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#00f2ff') },
      uOpacity: { value: 0.4 },
    },
    vertexShader: gridVertexShader,
    fragmentShader: gridFragmentShader,
    transparent: true,
  });
};
