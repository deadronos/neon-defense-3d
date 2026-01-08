import React from 'react';

import { SYNERGIES } from '../../../game/synergies';
import type { TowerEntity } from '../../../types';

interface InspectorSynergiesProps {
  selectedTowerEntity: TowerEntity;
}

export const InspectorSynergies: React.FC<InspectorSynergiesProps> = ({ selectedTowerEntity }) => {
  if (!selectedTowerEntity.activeSynergies || selectedTowerEntity.activeSynergies.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-800 pt-2">
      <div className="text-gray-500 uppercase tracking-widest text-[9px] mb-1">
        Active Synergies
      </div>
      <div className="flex flex-col gap-1">
        {selectedTowerEntity.activeSynergies.map((s) => {
          const def = SYNERGIES[s.type];
          return (
            <div
              key={`${s.type}:${s.partnerId}`}
              className="flex items-center gap-2 text-xs text-cyan-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 box-shadow-glow" />
              <span className="font-bold">{def.name}</span>
              <span className="text-cyan-600/80">- {def.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
