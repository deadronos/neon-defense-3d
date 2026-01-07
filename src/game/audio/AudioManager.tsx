import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { AudioManagerContext, type AudioContextValue } from './audioContext';
import { synth } from './Synth';

const playSFX = (name: string) => {
  synth.playSFX(name);
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [masterVolume, setMasterVolumeState] = useState(0.5);
  const [sfxVolume, setSfxVolumeState] = useState(1.0);
  const [musicVolume, setMusicVolumeState] = useState(0.3);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Initialize synth volumes
  useEffect(() => {
    synth.setMasterVolume(masterVolume);
    synth.setSFXVolume(sfxVolume);
    synth.setMusicVolume(musicVolume);
  }, [masterVolume, sfxVolume, musicVolume]);

  const toggleMusic = useCallback(() => {
    if (isMusicPlaying) {
      try {
        synth.stopMusic();
        setIsMusicPlaying(false);
      } catch (err) {
        // Keep playing state if stop failed and surface a non-fatal warning
        // so tests can assert the state remains true when synth.stopMusic throws.
        // Logging is intentionally non-fatal.

        console.warn('AudioManager: stopMusic failed', err);
      }
    } else {
      try {
        synth.startMusic();
        setIsMusicPlaying(true);
      } catch (err) {
        // If starting music fails, ensure state remains false and surface a warning
        // so tests can assert deterministic behavior.

        console.warn('AudioManager: startMusic failed', err);
        setIsMusicPlaying(false);
      }
    }
  }, [isMusicPlaying]);

  const setMasterVolume = useCallback((val: number) => {
    setMasterVolumeState(val);
    try {
      synth.setMasterVolume(val);
    } catch (err) {
      // Non-fatal: log and continue

      console.warn('AudioManager: setMasterVolume failed', err);
    }
  }, []);

  const setSFXVolume = useCallback((val: number) => {
    setSfxVolumeState(val);
    try {
      synth.setSFXVolume(val);
    } catch (err) {
      console.warn('AudioManager: setSFXVolume failed', err);
    }
  }, []);

  const setMusicVolume = useCallback((val: number) => {
    setMusicVolumeState(val);
    try {
      synth.setMusicVolume(val);
    } catch (err) {
      console.warn('AudioManager: setMusicVolume failed', err);
    }
  }, []);

  // Auto-start music on first interaction (handled by UI button usually)
  // or we can expose a method to start it.

  const contextValue = useMemo<AudioContextValue>(
    () => ({
      playSFX,
      setMasterVolume,
      setSFXVolume,
      setMusicVolume,
      toggleMusic,
      isMusicPlaying,
      masterVolume,
      sfxVolume,
      musicVolume,
    }),
    [
      isMusicPlaying,
      masterVolume,
      musicVolume,
      sfxVolume,
      setMasterVolume,
      setMusicVolume,
      setSFXVolume,
      toggleMusic,
    ],
  );

  return (
    <AudioManagerContext.Provider value={contextValue}>{children}</AudioManagerContext.Provider>
  );
};
