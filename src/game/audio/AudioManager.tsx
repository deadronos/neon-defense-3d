import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

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
      synth.stopMusic();
      setIsMusicPlaying(false);
    } else {
      synth.startMusic();
      setIsMusicPlaying(true);
    }
  };

  const setMasterVolume = (val: number) => {
    setMasterVolumeState(val);
    synth.setMasterVolume(val);
  };

  const setSFXVolume = (val: number) => {
    setSfxVolumeState(val);
    synth.setSFXVolume(val);
  };

  const setMusicVolume = (val: number) => {
    setMusicVolumeState(val);
    synth.setMusicVolume(val);
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
