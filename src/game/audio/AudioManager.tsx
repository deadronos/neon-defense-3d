import React, { createContext, useContext, useEffect, useState } from 'react';

import { synth } from './Synth';

interface AudioContextType {
  playSFX: (name: string) => void;
  setMasterVolume: (val: number) => void;
  setSFXVolume: (val: number) => void;
  setMusicVolume: (val: number) => void;
  toggleMusic: () => void;
  isMusicPlaying: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

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

  const playSFX = (name: string) => {
    synth.playSFX(name);
  };

  const toggleMusic = () => {
    if (isMusicPlaying) {
      try {
        synth.stopMusic();
        setIsMusicPlaying(false);
      } catch (e) {
        // Keep playing state if stop failed and surface a non-fatal warning
        // so tests can assert the state remains true when synth.stopMusic throws.
        // Logging is intentionally non-fatal.

        console.warn('AudioManager: stopMusic failed', e);
      }
    } else {
      try {
        synth.startMusic();
        setIsMusicPlaying(true);
      } catch (e) {
        // If starting music fails, ensure state remains false and surface a warning
        // so tests can assert deterministic behavior.

        console.warn('AudioManager: startMusic failed', e);
        setIsMusicPlaying(false);
      }
    }
  };

  const setMasterVolume = (val: number) => {
    setMasterVolumeState(val);
    try {
      synth.setMasterVolume(val);
    } catch (e) {
      // Non-fatal: log and continue

      console.warn('AudioManager: setMasterVolume failed', e);
    }
  };

  const setSFXVolume = (val: number) => {
    setSfxVolumeState(val);
    try {
      synth.setSFXVolume(val);
    } catch (e) {
      console.warn('AudioManager: setSFXVolume failed', e);
    }
  };

  const setMusicVolume = (val: number) => {
    setMusicVolumeState(val);
    try {
      synth.setMusicVolume(val);
    } catch (e) {
      console.warn('AudioManager: setMusicVolume failed', e);
    }
  };

  // Auto-start music on first interaction (handled by UI button usually)
  // or we can expose a method to start it.

  return (
    <AudioContext.Provider
      value={{
        playSFX,
        setMasterVolume,
        setSFXVolume,
        setMusicVolume,
        toggleMusic,
        isMusicPlaying,
        masterVolume,
        sfxVolume,
        musicVolume,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
