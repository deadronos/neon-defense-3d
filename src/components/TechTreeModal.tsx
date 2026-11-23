import React from 'react';

import { useGameUi } from '../game/gameContexts';
import { getResearchCost, MAX_RESEARCH_LEVEL } from '../game/utils';
import { UpgradeType } from '../types';

import { ModalFrame } from './ui/ModalFrame';

interface TechTreeModalProps {
  restoreFocusTo?: Element | null;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

const UPGRADES = [
  {
    type: UpgradeType.GLOBAL_DAMAGE,
    name: 'Weapon Overdrive',
    desc: '+5% Damage to all towers',
    icon: '⚔️',
    color: '#ff0055',
  },
  {
    type: UpgradeType.GLOBAL_RANGE,
    name: 'Sensor Array',
    desc: '+5% Range to all towers',
    icon: '📡',
    color: '#f9f871',
  },
  {
    type: UpgradeType.GLOBAL_GREED,
    name: 'Matter Recycler',
    desc: '+5% Starting Money & Kill Rewards',
    icon: '💰',
    color: '#00f2ff',
  },
] as const;

export const TechTreeModal: React.FC<TechTreeModalProps> = ({
  onClose,
  actionLabel,
  onAction,
  restoreFocusTo,
}) => {
  const { gameState, purchaseUpgrade } = useGameUi();

  return (
    <ModalFrame
      label="Tech Lab"
      restoreFocusTo={restoreFocusTo}
      onClose={onClose}
      className="w-11/12 max-w-4xl max-h-[85vh] flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/25 flex justify-between items-center bg-cyan-950/30">
        <div>
          <h2 className="text-3xl font-bold text-cyan-300 font-orbitron">TECH LAB</h2>
          <p className="text-gray-400 text-sm">Enhance systems for the next sector</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm text-gray-400">Available RP</div>
            <div className="text-3xl font-bold text-[#f9f871]">
              {Math.floor(gameState.researchPoints)}
            </div>
          </div>
          {onClose ? (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* Upgrade Grid */}
      <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
        {UPGRADES.map((u) => {
          const level = gameState.upgrades[u.type] ?? 0;
          const cost = getResearchCost(level);
          const maxed = level >= MAX_RESEARCH_LEVEL;
          const canAfford = !maxed && gameState.researchPoints >= cost;

          return (
            <div
              key={u.type}
              className="bg-cyan-950/30 border border-cyan-500/25 hover:border-cyan-300 p-6 rounded transition-all group flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="text-6xl mb-4 transform motion-safe:group-hover:scale-110 transition-transform">
                {u.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{u.name}</h3>
              <p className="text-gray-400 text-sm mb-4 h-10">{u.desc}</p>
              <div className="text-xs text-cyan-300 mb-4 font-mono px-2 py-1 bg-zinc-950 rounded">
                Lvl {level} Effect: +{Math.round(level * 5)}%
              </div>

              <button
                onClick={() => purchaseUpgrade(u.type, cost)}
                disabled={!canAfford}
                className={`w-full py-2 rounded font-bold transition-colors ${
                  canAfford
                    ? 'bg-cyan-300 hover:bg-cyan-200 text-black shadow-[0_0_10px_rgba(0,242,255,0.4)]'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {maxed ? 'Max level' : `Research (${cost} RP)`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-cyan-500/25 flex justify-end bg-cyan-950/30 gap-4">
        {onClose && !onAction ? (
          <button
            onClick={onClose}
            className="px-6 py-3 text-cyan-300 hover:text-white hover:bg-cyan-300/10 rounded transition-colors font-bold"
          >
            CLOSE
          </button>
        ) : null}
        {onAction ? (
          <button
            onClick={onAction}
            className="group relative px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded overflow-hidden shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-all"
          >
            <span className="relative z-10 flex items-center gap-2">
              {actionLabel ?? 'CONTINUE'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 transform motion-safe:group-hover:translate-x-1 transition-transform"
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
        ) : null}
      </div>
    </ModalFrame>
  );
};
