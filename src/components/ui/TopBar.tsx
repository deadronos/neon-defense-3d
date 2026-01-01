import React from 'react';

import type { WaveState } from '../../types';

interface TopBarProps {
  lives: number;
  money: number;
  wave: number;
  waveState: WaveState | null;
  onOpenSettings: () => void;
  onSkipWave: () => void;
  gameSpeed: number;
  onSetGameSpeed: (speed: number) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  lives,
  money,
  wave,
  waveState,
  onOpenSettings,
  onSkipWave,
  gameSpeed,
  onSetGameSpeed,
}) => {
  return (
    <div className="absolute top-0 w-full p-6 flex justify-between items-start pointer-events-auto">
      <div className="flex gap-6">
        <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-red-500 pl-4 pr-6 py-2 skew-x-[-10deg]">
          <div className="skew-x-10 flex flex-col">
            <span className="text-[10px] text-red-400 uppercase tracking-wider">Sys.Integrity</span>
            <span
              className={`text-2xl font-bold font-mono ${lives < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}
            >
              {lives}%
            </span>
          </div>
        </div>

        <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-yellow-400 pl-4 pr-6 py-2 skew-x-[-10deg]">
          <div className="skew-x-10 flex flex-col">
            <span className="text-[10px] text-yellow-500 uppercase tracking-wider">Resources</span>
            <span className="text-2xl font-bold font-mono text-yellow-300">${money}</span>
          </div>
        </div>

        <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-cyan-400 pl-4 pr-6 py-2 skew-x-[-10deg]">
          <div className="skew-x-10 flex flex-col">
            <span className="text-[10px] text-cyan-500 uppercase tracking-wider">
              {waveState?.phase === 'preparing' ? 'NEXT WAVE' : 'WAVE INDEX'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-cyan-300">{wave}</span>
              {waveState?.phase === 'preparing' && waveState.timer > 0 && (
                <span className="text-sm font-mono text-cyan-500 animate-pulse">
                  {waveState.timer.toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        {/* Speed Controls */}
        <div className="flex rounded-md overflow-hidden border border-fuchsia-500/40 bg-black/40">
          {[1, 2, 4].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onSetGameSpeed(speed)}
              className={`px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
                gameSpeed === speed
                  ? 'bg-fuchsia-500/40 text-white'
                  : 'text-fuchsia-200/60 hover:text-fuchsia-200 hover:bg-white/5'
              } ${speed !== 4 ? 'border-r border-fuchsia-500/20' : ''}`}
              aria-label={`Set speed to ${speed}x`}
              aria-pressed={gameSpeed === speed}
            >
              {speed}x
            </button>
          ))}
        </div>

        {waveState?.phase === 'preparing' && (
          <button
            type="button"
            onClick={onSkipWave}
            className="bg-black/40 border border-cyan-500/40 hover:border-cyan-400/70 text-cyan-200 px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider flex items-center gap-2 group"
            aria-label="Skip to next wave"
          >
            <span aria-hidden="true" className="group-hover:translate-x-1 transition-transform">
              ⏩
            </span>
            Skip
          </button>
        )}

        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-black/40 border border-fuchsia-500/40 hover:border-fuchsia-400/70 text-fuchsia-200 px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider flex items-center gap-2"
          aria-label="Open settings"
        >
          <span aria-hidden="true">🔧</span>
          Settings
        </button>
      </div>
    </div>
  );
};
