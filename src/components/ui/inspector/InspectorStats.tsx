import React from 'react';

import { getTowerStats } from '../../../game/utils';
import type { TowerEntity, UpgradeType } from '../../../types';

interface InspectorStatsProps {
  selectedTowerEntity: TowerEntity;
  upgrades: { [key in UpgradeType]?: number };
}

export const InspectorStats: React.FC<InspectorStatsProps> = ({
  selectedTowerEntity,
  upgrades,
}) => {
  const current = getTowerStats(selectedTowerEntity.type, selectedTowerEntity.level, {
    upgrades,
    activeSynergies: selectedTowerEntity.activeSynergies,
  });
  const next = getTowerStats(selectedTowerEntity.type, selectedTowerEntity.level + 1, {
    upgrades,
    activeSynergies: selectedTowerEntity.activeSynergies,
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
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
          <span className="text-green-500 text-xs">+{(next.range - current.range).toFixed(1)}</span>
        </div>
      </div>
      <div>
        <div className="text-gray-500 uppercase tracking-widest text-[9px]">Rate</div>
        <div className="font-mono text-white text-lg">
          {(1 / current.cooldown).toFixed(1)}{' '}
          <span className="text-green-500 text-xs text-[10px]">UP</span>
        </div>
      </div>
    </div>
  );
};
