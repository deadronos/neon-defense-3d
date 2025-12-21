import React from 'react';

import { TOWER_CONFIGS } from '../../constants';
import { getTowerStats } from '../../game/utils';
import type { TowerEntity, UpgradeType } from '../../types';

interface UpgradeInspectorProps {
  selectedTowerEntity: TowerEntity;
  upgrades: { [key in UpgradeType]?: number };
  money: number;
  onClose: () => void;
  onUpgrade: (id: string) => void;
  onSell: (id: string) => void;
}

export const UpgradeInspector: React.FC<UpgradeInspectorProps> = ({
  selectedTowerEntity,
  upgrades,
  money,
  onClose,
  onUpgrade,
  onSell,
}) => {
  return (
    <div className="absolute bottom-10 w-full flex justify-center pointer-events-auto">
      <div className="bg-black/90 backdrop-blur border-t-2 border-cyan-500/50 p-6 flex gap-8 shadow-2xl min-w-[500px] animate-fade-in-up">
        {/* Info */}
        <div className="flex flex-col gap-2 flex-grow">
          <div className="flex items-center gap-3 border-b border-gray-800 pb-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: TOWER_CONFIGS[selectedTowerEntity.type].color,
                boxShadow: `0 0 10px ${TOWER_CONFIGS[selectedTowerEntity.type].color}`,
              }}
            />
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">
              {TOWER_CONFIGS[selectedTowerEntity.type].name}
            </h2>
            <span className="ml-auto text-xs bg-cyan-900/40 text-cyan-300 px-2 py-0.5 border border-cyan-700/50 font-mono">
              LVL {selectedTowerEntity.level}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 text-xs">
            {(() => {
              const current = getTowerStats(
                selectedTowerEntity.type,
                selectedTowerEntity.level,
                upgrades,
              );
              const next = getTowerStats(
                selectedTowerEntity.type,
                selectedTowerEntity.level + 1,
                upgrades,
              );
              return (
                <>
                  <div>
                    <div className="text-gray-500 uppercase tracking-widest text-[9px]">Damage</div>
                    <div className="font-mono text-white text-lg">
                      {current.damage.toFixed(0)}{' '}
                      <span className="text-green-500 text-xs">
                        +{(next.damage - current.damage).toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 uppercase tracking-widest text-[9px]">Range</div>
                    <div className="font-mono text-white text-lg">
                      {current.range.toFixed(1)}{' '}
                      <span className="text-green-500 text-xs">
                        +{(next.range - current.range).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 uppercase tracking-widest text-[9px]">Rate</div>
                    <div className="font-mono text-white text-lg">
                      {(1 / current.cooldown).toFixed(1)}{' '}
                      <span className="text-green-500 text-xs text-[10px]">UP</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 min-w-[140px] border-l border-gray-800 pl-6 justify-center">
          <button
            className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest text-right mb-auto"
            onClick={onClose}
          >
            Close [ESC]
          </button>

          {(() => {
            const nextStats = getTowerStats(
              selectedTowerEntity.type,
              selectedTowerEntity.level + 1,
              upgrades,
            );
            const canAfford = money >= nextStats.upgradeCost;
            return (
              <button
                onClick={() => onUpgrade(selectedTowerEntity.id)}
                disabled={!canAfford}
                className={`
                            relative group flex flex-col items-center justify-center p-2 border transition-all duration-200
                            ${canAfford ? 'border-cyan-500 bg-cyan-900/20 hover:bg-cyan-500/20' : 'border-gray-800 opacity-50 cursor-not-allowed'}
                        `}
              >
                <span className="font-bold text-white text-sm uppercase tracking-wider">
                  Upgrade
                </span>
                <span
                  className={`text-xs font-mono ${canAfford ? 'text-cyan-300' : 'text-gray-500'}`}
                >
                  ${nextStats.upgradeCost}
                </span>
              </button>
            );
          })()}

          {(() => {
            const config = TOWER_CONFIGS[selectedTowerEntity.type];
            const refund = Math.floor((config?.cost ?? 0) * 0.7);
            return (
              <button
                onClick={() => onSell(selectedTowerEntity.id)}
                className="mt-1 text-xs text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-500/50 px-2 py-1 transition-colors uppercase tracking-wider"
                aria-label={`Sell unit for $${refund}`}
              >
                Sell Unit (+${refund})
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
