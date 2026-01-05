import { createContext } from 'react';

export interface AudioContextValue {
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

export const AudioManagerContext = createContext<AudioContextValue | undefined>(undefined);
