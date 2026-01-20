import React from 'react';

import { TOWER_CONFIGS } from '../../../constants';
import type { TowerEntity } from '../../../types';

interface InspectorHeaderProps {
  selectedTowerEntity: TowerEntity;
}

export const InspectorHeader: React.FC<InspectorHeaderProps> = ({ selectedTowerEntity }) => {
  const config = TOWER_CONFIGS[selectedTowerEntity.type];

  return (
    <div className="flex items-center gap-4 border-b border-zinc-800 pb-4 mb-2">
      <div className="relative">
        <div
          className="w-4 h-4 rounded-full"
          style={{
            background: config.color,
            boxShadow: `0 0 10px ${config.color}`,
          }}
        />
        <div
          className="absolute -inset-1 rounded-full opacity-50 blur-sm"
          style={{ background: config.color }}
        />
      </div>
      <h2 className="text-2xl font-bold text-white uppercase tracking-wider font-display">
        {config.name}
      </h2>
      <div className="ml-auto">
        <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-900">
          LVL {selectedTowerEntity.level}
        </span>
      </div>
    </div>
  );
};
