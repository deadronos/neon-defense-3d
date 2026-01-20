import React from 'react';

import { getTowerStats } from '../../../game/utils';
import type { TowerEntity, UpgradeType } from '../../../types';
import { Separator } from '../../ui/separator';

interface InspectorStatsProps {
  selectedTowerEntity: TowerEntity;
  upgrades: { [key in UpgradeType]?: number };
}

export const InspectorStats: React.FC<InspectorStatsProps> = ({
  selectedTowerEntity,
  upgrades,
  activeSynergies,
}: any) => {
  // TODO: fix typing for activeSynergies if needed, or pass it down
  const current = getTowerStats(selectedTowerEntity.type, selectedTowerEntity.level, {
    upgrades,
    activeSynergies: selectedTowerEntity.activeSynergies,
  });
  const next = getTowerStats(selectedTowerEntity.type, selectedTowerEntity.level + 1, {
    upgrades,
    activeSynergies: selectedTowerEntity.activeSynergies,
  });

  return (
    <div className="grid grid-cols-3 gap-2 py-2">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Damage</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-mono text-white">{current.damage.toFixed(0)}</span>
          <span className="text-xs font-mono text-emerald-400">
            +{(next.damage - current.damage).toFixed(0)}
          </span>
        </div>
      </div>

      <div className="flex flex-col border-l border-zinc-800 pl-4">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Range</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-mono text-white">{current.range.toFixed(1)}</span>
          <span className="text-xs font-mono text-emerald-400">
            +{(next.range - current.range).toFixed(1)}
          </span>
        </div>
      </div>

      <div className="flex flex-col border-l border-zinc-800 pl-4">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Rate</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-mono text-white">{(1 / current.cooldown).toFixed(1)}</span>
          <span className="text-xs font-mono text-emerald-400">UP</span>
        </div>
      </div>
    </div>
  );
};
