import React from 'react';

interface SettingsAudioSectionProps {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  setMasterVolume: (value: number) => void;
  setSFXVolume: (value: number) => void;
  setMusicVolume: (value: number) => void;
}

export const SettingsAudioSection: React.FC<SettingsAudioSectionProps> = ({
  masterVolume,
  sfxVolume,
  musicVolume,
  setMasterVolume,
  setSFXVolume,
  setMusicVolume,
}) => (
  <section className="bg-black/20 border border-[#0f3460] rounded p-5">
    <h3 className="text-lg font-bold text-white mb-2">Audio</h3>
    <div className="space-y-4 max-w-md">
      <div className="flex items-center gap-4">
        <label className="text-gray-300 text-sm w-16">Master</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={masterVolume}
          onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-4">
        <label className="text-gray-300 text-sm w-16">SFX</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={sfxVolume}
          onChange={(e) => setSFXVolume(parseFloat(e.target.value))}
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-4">
        <label className="text-gray-300 text-sm w-16">Music</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={musicVolume}
          onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
          className="flex-1"
        />
      </div>
    </div>
  </section>
);
