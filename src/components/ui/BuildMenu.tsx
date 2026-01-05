import React from 'react';

import { TOWER_CONFIGS } from '../../constants';
import { getTowerStats } from '../../game/utils';
import { TowerType } from '../../types';
import type { UpgradeType } from '../../types';

interface BuildMenuProps {
  selectedTower: TowerType | null;
  onSelectTower: (type: TowerType | null) => void;
  money: number;
  upgrades: { [key in UpgradeType]?: number };
}

export const BuildMenu: React.FC<BuildMenuProps> = ({
  selectedTower,
  onSelectTower,
  money,
  upgrades,
}) => {
  return (
    <div className="absolute bottom-10 w-full flex justify-center pointer-events-auto">
      <div
        className="bg-black/80 backdrop-blur-md border border-gray-800 p-3 sm:p-4 flex flex-wrap gap-3 sm:gap-4 justify-center max-w-[min(98%,1000px)] shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        style={{
          clipPath:
            'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
        }}
      >
        {Object.values(TowerType).map((type) => {
          const config = TOWER_CONFIGS[type];
          const isSelected = selectedTower === type;
          const canAfford = money >= config.cost;

          // Display base stats, assume level 1 and active upgrades
          const stats = getTowerStats(type, 1, { upgrades });

          const ariaLabel = isSelected
            ? `Deselect ${config.name}`
            : `Select ${config.name}, Cost ${config.cost}`;

          return (
            <button
              key={type}
              onClick={() => {
                if (isSelected) {
                  onSelectTower(null);
                } else if (canAfford) {
                  onSelectTower(type);
                }
              }}
              aria-label={ariaLabel}
              aria-pressed={isSelected}
              aria-disabled={!canAfford && !isSelected}
              className={`
                relative group flex flex-col items-center p-2 sm:p-3 transition-all duration-200 w-20 sm:w-24 md:w-28 border
                ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'border-gray-800 bg-transparent hover:border-gray-600 hover:bg-gray-900'
                }
                ${!canAfford ? 'opacity-40 grayscale' : ''}
                ${!canAfford && !isSelected ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div
                className="w-10 h-10 mb-3 shadow-lg transition-transform duration-300 group-hover:scale-110 flex items-center justify-center border border-white/10"
                style={{ backgroundColor: `${config.color}22` }}
              >
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shadow-[0_0_10px_currentColor]"
                  style={{
                    backgroundColor: config.color,
                    boxShadow: `0 0 10px ${config.color}`,
                  }}
                />
              </div>

              <span className="text-[9px] sm:text-[10px] font-bold text-gray-300 uppercase tracking-widest group-hover:text-white transition-colors">
                {config.name}
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  canAfford ? 'text-yellow-400' : 'text-gray-600'
                }`}
              >
                ${config.cost}
              </span>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-6 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-y-2 group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-all duration-200 w-40 sm:w-48 bg-black/95 p-3 sm:p-4 text-xs text-left border border-cyan-900 pointer-events-none shadow-2xl z-20 backdrop-blur-md">
                <h3 className="font-bold text-cyan-400 text-sm mb-1 uppercase tracking-wider border-b border-cyan-900 pb-1">
                  {config.name}
                </h3>
                <p className="text-gray-400 mb-3 italic">{config.description}</p>
                <div className="grid grid-cols-2 gap-y-1 text-gray-500 font-mono text-[10px]">
                  <span>
                    DMG: <span className="text-white">{stats.damage.toFixed(0)}</span>
                  </span>
                  <span>
                    SPD: <span className="text-white">{(1 / stats.cooldown).toFixed(1)}/s</span>
                  </span>
                  <span className="col-span-2">
                    RNG: <span className="text-white">{stats.range.toFixed(1)}M</span>
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
