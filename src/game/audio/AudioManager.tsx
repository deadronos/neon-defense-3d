import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { AudioManagerContext, type AudioContextValue } from './audioContext';
import { DEFAULT_VOLUMES, synth } from './Synth';

const playSFX = (name: string) => {
  synth.playSFX(name);
};

const VOLUME_STORAGE_KEY = 'neon-defense:audio-volumes';
type VolumeName = keyof typeof DEFAULT_VOLUMES;

function clampVolume(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function readVolume(name: VolumeName) {
  const fallback = DEFAULT_VOLUMES[name];
  try {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
    const volumes = stored
      ? (JSON.parse(stored) as Partial<Record<VolumeName, unknown>> | null)
      : null;
    return clampVolume(volumes?.[name], fallback);
  } catch {
    return fallback;
  }
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [masterVolume, setMasterVolumeState] = useState(() => readVolume('masterVolume'));
  const [sfxVolume, setSfxVolumeState] = useState(() => readVolume('sfxVolume'));
  const [musicVolume, setMusicVolumeState] = useState(() => readVolume('musicVolume'));
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Apply and persist the current volume settings.
  useEffect(() => {
    synth.setMasterVolume(masterVolume);
    synth.setSFXVolume(sfxVolume);
    synth.setMusicVolume(musicVolume);
    try {
      localStorage.setItem(
        VOLUME_STORAGE_KEY,
        JSON.stringify({ masterVolume, sfxVolume, musicVolume }),
      );
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
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
    const volume = clampVolume(val, DEFAULT_VOLUMES.masterVolume);
    setMasterVolumeState(volume);
    try {
      synth.setMasterVolume(volume);
    } catch (err) {
      // Non-fatal: log and continue

      console.warn('AudioManager: setMasterVolume failed', err);
    }
  }, []);

  const setSFXVolume = useCallback((val: number) => {
    const volume = clampVolume(val, DEFAULT_VOLUMES.sfxVolume);
    setSfxVolumeState(volume);
    try {
      synth.setSFXVolume(volume);
    } catch (err) {
      console.warn('AudioManager: setSFXVolume failed', err);
    }
  }, []);

  const setMusicVolume = useCallback((val: number) => {
    const volume = clampVolume(val, DEFAULT_VOLUMES.musicVolume);
    setMusicVolumeState(volume);
    try {
      synth.setMusicVolume(volume);
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
