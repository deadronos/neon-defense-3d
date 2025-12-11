import React from 'react';

import { useGame } from '../game/GameState';
import { UpgradeType } from '../types';

export const TechTreeModal: React.FC = () => {
  const { gameState, purchaseUpgrade, startNextSector } = useGame();

  const UPGRADES = [
    {
      type: UpgradeType.GLOBAL_DAMAGE,
      name: 'Weapon Overdrive',
      desc: '+5% Damage to all towers',
      baseCost: 1,
      icon: '⚔️',
      color: '#ff0055',
    },
    {
      type: UpgradeType.GLOBAL_RANGE,
      name: 'Sensor Array',
      desc: '+5% Range to all towers',
      baseCost: 1,
      icon: '📡',
      color: '#f9f871',
    },
    {
      type: UpgradeType.GLOBAL_GREED,
      name: 'Matter Recycler',
      desc: '+5% Starting Money & Kill Rewards',
      baseCost: 1,
      icon: '💰',
      color: '#00f2ff',
    },
  ];

  const getCost = (level: number, baseCost: number) => {
    return baseCost + level; // Simple linear scaling: 1, 2, 3...
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 backdrop-blur-sm">
      <div className="bg-[#16213e] border-2 border-[#00f2ff] w-3/4 max-w-4xl h-3/4 flex flex-col rounded-lg shadow-[0_0_40px_rgba(0,242,255,0.2)]">
        {/* Header */}
        <div className="p-6 border-b border-[#0f3460] flex justify-between items-center bg-[#1a1a2e]">
          <div>
            <h2 className="text-3xl font-bold text-[#00f2ff] font-orbitron">TECH LAB</h2>
            <p className="text-gray-400 text-sm">Enhance systems for the next sector</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Available RP</div>
            <div className="text-3xl font-bold text-[#f9f871]">
              {Math.floor(gameState.researchPoints)}
            </div>
          </div>
        </div>

        {/* Upgrade Grid */}
        <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
          {UPGRADES.map((u) => {
            const level = gameState.upgrades[u.type] || 0;
            const cost = getCost(level, u.baseCost);
            const canAfford = gameState.researchPoints >= cost;

            return (
              <div
                key={u.type}
                className="bg-[#0f3460]/50 border border-[#0f3460] hover:border-[#00f2ff] p-6 rounded transition-all group flex flex-col items-center text-center relative overflow-hidden"
              >
                <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform">
                  {u.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{u.name}</h3>
                <p className="text-gray-400 text-sm mb-4 h-10">{u.desc}</p>
                <div className="text-xs text-[#00f2ff] mb-4 font-mono px-2 py-1 bg-[#16213e] rounded">
                  Lvl {level} Effect: +{Math.round(level * 5)}%
                </div>

                <button
                  onClick={() => purchaseUpgrade(u.type, cost)}
                  disabled={!canAfford}
                  className={`w-full py-2 rounded font-bold transition-colors ${
                    canAfford
                      ? 'bg-[#00f2ff] hover:bg-[#4dffff] text-black shadow-[0_0_10px_rgba(0,242,255,0.4)]'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Research ({cost} RP)
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#0f3460] flex justify-end bg-[#1a1a2e]">
          <button
            onClick={startNextSector}
            className="group relative px-8 py-3 bg-[#e94560] hover:bg-[#ff5777] text-white font-bold rounded overflow-hidden shadow-[0_0_20px_rgba(233,69,96,0.3)] transition-all"
          >
            <span className="relative z-10 flex items-center gap-2">
              WARP TO NEXT SECTOR
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 transform group-hover:translate-x-1 transition-transform"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
