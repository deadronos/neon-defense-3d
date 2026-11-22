import React from 'react';

import type { GraphicsQuality } from '../../../types';

interface SettingsQualitySectionProps {
  graphicsQuality: GraphicsQuality;
  qualityLabel: string;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
}

export const SettingsQualitySection: React.FC<SettingsQualitySectionProps> = ({
  graphicsQuality,
  qualityLabel,
  setGraphicsQuality,
}) => (
  <section className="bg-black/20 border border-cyan-500/25 rounded p-5">
    <h3 className="text-lg font-bold text-white mb-2">Quality</h3>
    <p className="text-gray-400 text-sm mb-4">
      Current preset: <span className="text-fuchsia-200 font-mono">{qualityLabel}</span>
    </p>
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => setGraphicsQuality('high')}
        className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider border transition-colors ${
          graphicsQuality === 'high'
            ? 'bg-cyan-300 text-black border-cyan-300'
            : 'bg-black/30 text-white border-cyan-500/25 hover:border-cyan-300'
        }`}
      >
        High
      </button>
      <button
        type="button"
        onClick={() => setGraphicsQuality('low')}
        className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider border transition-colors ${
          graphicsQuality === 'low'
            ? 'bg-cyan-300 text-black border-cyan-300'
            : 'bg-black/30 text-white border-cyan-500/25 hover:border-cyan-300'
        }`}
      >
        Low
      </button>
    </div>
  </section>
);
