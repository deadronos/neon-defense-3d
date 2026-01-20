import React, { useEffect, useState } from 'react';

import { TOWER_CONFIGS } from '../../../constants';
import { getTowerStats } from '../../../game/utils';
import type { TowerEntity, UpgradeType } from '../../../types';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

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
    <div className="flex flex-col gap-3 min-w-[200px] border-t sm:border-t-0 sm:border-l border-zinc-800 pt-4 sm:pt-0 sm:pl-6 justify-center">
      <div className="flex justify-end mb-auto">
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] h-6 text-zinc-500 hover:text-white uppercase tracking-widest"
          onClick={onClose}
        >
          Close [ESC]
        </Button>
      </div>

      <Button
        onClick={() => onUpgrade(selectedTowerEntity.id)}
        disabled={!canAfford}
        className="h-14 relative flex flex-col items-center justify-center border-cyan-500/50 hover:bg-cyan-900/30 bg-cyan-900/10 text-cyan-50"
        variant="outline"
      >
        <span className="font-bold text-sm uppercase tracking-wider">Upgrade</span>
        <Badge
          variant="secondary"
          className={`mt-0.5 h-4 text-[10px] font-mono ${canAfford ? 'text-cyan-300 bg-cyan-950' : 'text-zinc-500 bg-zinc-900'}`}
        >
          ${nextStats.upgradeCost}
        </Badge>
      </Button>

      <Button
        onClick={() => {
          if (isConfirmingSell) {
            onSell(selectedTowerEntity.id);
            setIsConfirmingSell(false);
          } else {
            setIsConfirmingSell(true);
          }
        }}
        variant={isConfirmingSell ? 'destructive' : 'ghost'}
        className={`
          mt-1 h-9 text-xs uppercase tracking-wider border transition-all
          ${
            isConfirmingSell
              ? 'animate-pulse font-bold'
              : 'text-red-400 hover:text-red-300 border-red-900/30 hover:border-red-500/50 bg-transparent hover:bg-red-950/30'
          }
        `}
      >
        {isConfirmingSell ? 'Confirm Sell?' : `Sell Unit (+$${refund})`}
      </Button>
    </div>
  );
};
