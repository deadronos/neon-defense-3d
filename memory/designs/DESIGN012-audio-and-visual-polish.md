# DESIGN012 - Audio System and Visual Polish

## 1. Introduction

This design outlines the implementation of an Audio System using procedural synthesis and Visual Polish (Bloom) using `@react-three/postprocessing`.

## 2. Audio System

Implemented a centralized `AudioManager` and `Synth` class.

### 2.1 Architecture

- **Synth.ts**: Uses `AudioContext` to generate procedural sound buffers (Saw/Sine waves, noise bursts).
  - No external assets required.
  - Generates: `shoot`, `impact`, `build`, `sell`, `click`, `error` SFX.
  - Generates a simple BGM drone.
- **AudioManager.tsx**: React Context providing `playSFX`, `toggleMusic`, and volume state.
- **Integration**:
  - `GameState.tsx` triggers SFX on `ProjectileFired` (new event) and `EffectSpawned`.
  - UI components trigger SFX on clicks.

## 3. Visual Polish (Bloom)

Integrated `@react-three/postprocessing`.

### 3.1 Implementation

- **GameCanvas**: Added `<EffectComposer>` with `<Bloom>`.
  - Disabled for `Low` graphics quality to save performance.
- **Materials**: Updated `Projectiles`, `InstancedTowers`, `Enemies`, and `World` (grid) to use `MeshStandardMaterial` with `emissive` properties.
  - Emissive intensity and color multiplication used to exceed bloom threshold.

## 4. Testing

- Mocked `AudioContext` in `setupTests.ts` to support JSDOM environment.
- Mocked `useAudio` hook in component tests.
