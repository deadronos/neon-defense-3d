import React from 'react';
import { WaveState } from '../../types';

interface TopBarProps {
  lives: number;
  money: number;
  wave: number;
  waveState: WaveState | null;
}

export const TopBar: React.FC<TopBarProps> = ({ lives, money, wave, waveState }) => {
  return (
    <div className="absolute top-0 w-full p-6 flex justify-between items-start pointer-events-auto">
      <div className="flex gap-6">
        <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-red-500 pl-4 pr-6 py-2 skew-x-[-10deg]">
          <div className="skew-x-[10deg] flex flex-col">
            <span className="text-[10px] text-red-400 uppercase tracking-wider">
              Sys.Integrity
            </span>
            <span
              className={`text-2xl font-bold font-mono ${lives < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}
            >
              {lives}%
            </span>
          </div>
        </div>

        <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-yellow-400 pl-4 pr-6 py-2 skew-x-[-10deg]">
          <div className="skew-x-[10deg] flex flex-col">
            <span className="text-[10px] text-yellow-500 uppercase tracking-wider">
              Resources
            </span>
            <span className="text-2xl font-bold font-mono text-yellow-300">
              ${money}
            </span>
          </div>
        </div>

        <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-cyan-400 pl-4 pr-6 py-2 skew-x-[-10deg]">
          <div className="skew-x-[10deg] flex flex-col">
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
    </div>
  );
};
