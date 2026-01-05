import React from 'react';

interface SettingsResetSectionProps {
  hasCheckpoint: boolean;
  onResetCheckpoint: () => void;
  onFactoryReset: () => void;
}

export const SettingsResetSection: React.FC<SettingsResetSectionProps> = ({
  hasCheckpoint,
  onResetCheckpoint,
  onFactoryReset,
}) => (
  <section className="bg-black/20 border border-[#0f3460] rounded p-5">
    <h3 className="text-lg font-bold text-white mb-2">Reset</h3>
    <p className="text-gray-400 text-sm mb-4">
      Reset Checkpoint reloads the last autosaved checkpoint. Factory Reset clears all progress/meta
      and deletes the checkpoint (Quality is preserved).
    </p>

    <div className="flex flex-col md:flex-row gap-3">
      <button
        type="button"
        onClick={onResetCheckpoint}
        disabled={!hasCheckpoint}
        className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider border transition-colors ${
          hasCheckpoint
            ? 'bg-black/40 border-[#0f3460] hover:border-[#00f2ff] text-white'
            : 'bg-black/20 border-[#0f3460] text-gray-500 cursor-not-allowed'
        }`}
      >
        Reset Checkpoint
      </button>
      <button
        type="button"
        onClick={onFactoryReset}
        className="bg-[#e94560] hover:bg-[#ff5777] text-white px-4 py-2 rounded font-mono text-xs uppercase tracking-wider"
      >
        Factory Reset
      </button>
    </div>
  </section>
);
