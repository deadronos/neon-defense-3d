import React from 'react';

import { useAudio } from '../../game/audio/useAudio';
import { MAX_LIVES } from '../../game/engine/uiReducer';
import type { WaveState } from '../../types';

interface TopBarProps {
  onTogglePause?: () => void;
  location?: string;
  seed?: string | null;
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
  onTogglePause,
  location,
  seed,
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
    <div className="absolute top-0 w-full p-3 sm:p-6 flex flex-wrap sm:flex-nowrap justify-between items-start gap-2 pointer-events-auto">
      <div className="flex gap-3 sm:gap-6 items-start">
        <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-red-500 pl-3 pr-4 py-1 sm:pl-4 sm:pr-6 sm:py-2 skew-x-[-10deg]">
          <div className="skew-x-10 flex flex-col">
            <span className="text-[9px] sm:text-[10px] text-red-400 uppercase tracking-wider">
              Sys.Integrity
            </span>
            <span
              className={`text-xl sm:text-2xl font-bold font-mono ${lives < 10 ? 'text-red-500 motion-safe:animate-pulse' : 'text-white'}`}
            >
              {Math.round((lives / MAX_LIVES) * 100)}%
            </span>
          </div>
        </div>

        <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-yellow-400 pl-3 pr-4 py-1 sm:pl-4 sm:pr-6 sm:py-2 skew-x-[-10deg]">
          <div className="skew-x-10 flex flex-col">
            <span className="text-[9px] sm:text-[10px] text-yellow-500 uppercase tracking-wider">
              Resources
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-yellow-300">
              ${Math.floor(money)}
            </span>
          </div>
        </div>

        <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-cyan-400 pl-3 pr-4 py-1 sm:pl-4 sm:pr-6 sm:py-2 skew-x-[-10deg]">
          <div className="skew-x-10 flex flex-col">
            <span className="text-[9px] sm:text-[10px] text-cyan-500 uppercase tracking-wider">
              {waveState?.phase === 'preparing' ? 'NEXT WAVE' : 'WAVE INDEX'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">{wave}</span>
              {waveState?.phase === 'preparing' && waveState.timer > 0 && (
                <span className="text-[10px] sm:text-sm font-mono text-cyan-500 motion-safe:animate-pulse">
                  {waveState.timer.toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        {location && (
          <div className="flex flex-col font-mono text-xs text-cyan-200">
            <span>{location}</span>
            {seed && (
              <span className="rounded border border-cyan-500/40 px-1 text-[10px]">
                Seed {seed}
              </span>
            )}
          </div>
        )}
        <MusicToggle />
        {/* Speed Controls */}
        <div className="flex rounded-md overflow-hidden border border-fuchsia-500/40 bg-black/40">
          {onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={gameSpeed === 0 ? 'Resume game' : 'Pause game'}
              aria-pressed={gameSpeed === 0}
              className={`border-r border-fuchsia-500/20 px-2 py-1 sm:px-3 sm:py-2 text-fuchsia-200 hover:bg-fuchsia-500/20 ${gameSpeed === 0 ? 'bg-fuchsia-500/40' : ''}`}
            >
              <span aria-hidden="true">{gameSpeed === 0 ? '▶' : '⏸'}</span>
            </button>
          )}
          {[1, 2, 4].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onSetGameSpeed(speed)}
              className={`px-2 py-1 sm:px-3 sm:py-2 font-mono text-[10px] sm:text-xs uppercase tracking-wider transition-colors ${
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
            className="bg-black/40 border border-cyan-500/40 hover:border-cyan-400/70 text-cyan-200 px-3 py-1 sm:px-4 sm:py-2 rounded-md font-mono text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-2 group"
            aria-label="Skip to next wave"
          >
            <span aria-hidden="true" className="group-hover:translate-x-1 transition-transform">
              ⏩
            </span>
            <span className="hidden sm:inline">Skip</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-black/40 border border-fuchsia-500/40 hover:border-fuchsia-400/70 text-fuchsia-200 px-3 py-1 sm:px-4 sm:py-2 rounded-md font-mono text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-2"
          aria-label="Open settings"
        >
          <span aria-hidden="true">🔧</span>
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>
    </div>
  );
};

const MusicToggle = () => {
  const { toggleMusic, isMusicPlaying } = useAudio();
  return (
    <button
      type="button"
      onClick={toggleMusic}
      className={`bg-black/40 border ${isMusicPlaying ? 'border-fuchsia-500/80 text-fuchsia-300' : 'border-gray-600 text-gray-400'} px-2 py-1 sm:px-3 sm:py-2 rounded-md font-mono text-[10px] sm:text-xs uppercase tracking-wider transition-colors hover:bg-white/5`}
      aria-label="Toggle Music"
    >
      {isMusicPlaying ? '♫ ON' : '♫ OFF'}
    </button>
  );
};
