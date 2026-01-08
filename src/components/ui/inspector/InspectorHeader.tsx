import React from 'react';

import { TOWER_CONFIGS } from '../../../constants';
import type { TowerEntity } from '../../../types';

interface InspectorHeaderProps {
  selectedTowerEntity: TowerEntity;
}

export const InspectorHeader: React.FC<InspectorHeaderProps> = ({ selectedTowerEntity }) => {
  return (
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
  );
};
