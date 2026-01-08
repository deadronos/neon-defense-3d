import React, { useEffect, useState } from 'react';

import { TOWER_CONFIGS } from '../../../constants';
import { getTowerStats } from '../../../game/utils';
import type { TowerEntity, UpgradeType } from '../../../types';

interface InspectorActionsProps {
  selectedTowerEntity: TowerEntity;
  upgrades: { [key in UpgradeType]?: number };
  money: number;
  onClose: () => void;
  onUpgrade: (id: string) => void;
  onSell: (id: string) => void;
}

export const InspectorActions: React.FC<InspectorActionsProps> = ({
  selectedTowerEntity,
  upgrades,
  money,
  onClose,
  onUpgrade,
  onSell,
}) => {
  const [isConfirmingSell, setIsConfirmingSell] = useState(false);

  // Reset confirmation state when selected tower changes
  useEffect(() => {
    setIsConfirmingSell(false);
  }, [selectedTowerEntity.id]);

  // Reset confirmation state after 3 seconds if not clicked
  useEffect(() => {
    if (isConfirmingSell) {
      const timer = setTimeout(() => {
        setIsConfirmingSell(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingSell]);

  const nextStats = getTowerStats(selectedTowerEntity.type, selectedTowerEntity.level + 1, {
    upgrades,
    activeSynergies: selectedTowerEntity.activeSynergies,
  });
  const canAfford = money >= nextStats.upgradeCost;

  const config = TOWER_CONFIGS[selectedTowerEntity.type];
  const refund = Math.floor(config.cost * 0.7);

  return (
    <div className="flex flex-col gap-3 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-gray-800 pt-4 sm:pt-0 sm:pl-6 justify-center">
      <button
        className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest text-right mb-auto"
        onClick={onClose}
      >
        Close [ESC]
      </button>

      <button
        onClick={() => onUpgrade(selectedTowerEntity.id)}
        disabled={!canAfford}
        className={`
          relative group flex flex-col items-center justify-center p-2 border transition-all duration-200
          ${
            canAfford
              ? 'border-cyan-500 bg-cyan-900/20 hover:bg-cyan-500/20'
              : 'border-gray-800 opacity-50 cursor-not-allowed'
          }
        `}
      >
        <span className="font-bold text-white text-sm uppercase tracking-wider">Upgrade</span>
        <span className={`text-xs font-mono ${canAfford ? 'text-cyan-300' : 'text-gray-500'}`}>
          ${nextStats.upgradeCost}
        </span>
      </button>

      <button
        onClick={() => {
          if (isConfirmingSell) {
            onSell(selectedTowerEntity.id);
            setIsConfirmingSell(false);
          } else {
            setIsConfirmingSell(true);
          }
        }}
        className={`
          mt-1 text-xs px-2 py-1 transition-all uppercase tracking-wider border
          ${
            isConfirmingSell
              ? 'bg-red-900/40 text-red-200 border-red-500 animate-pulse font-bold'
              : 'text-red-400 hover:text-red-300 border-red-900/30 hover:border-red-500/50 bg-transparent'
          }
        `}
        aria-label={
          isConfirmingSell ? 'Confirm sell? Click again to sell unit' : `Sell unit for $${refund}`
        }
      >
        {isConfirmingSell ? 'Confirm Sell?' : `Sell Unit (+$${refund})`}
      </button>
    </div>
  );
};
