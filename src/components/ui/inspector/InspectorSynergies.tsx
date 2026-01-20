import React from 'react';

import { SYNERGIES } from '../../../game/synergies';
import type { TowerEntity } from '../../../types';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';

interface InspectorSynergiesProps {
  selectedTowerEntity: TowerEntity;
}

export const InspectorSynergies: React.FC<InspectorSynergiesProps> = ({ selectedTowerEntity }) => {
  if (!selectedTowerEntity.activeSynergies || selectedTowerEntity.activeSynergies.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 pt-2">
      <div className="text-zinc-500 uppercase tracking-widest text-[9px] mb-2 font-bold">
        Active Synergies
      </div>
      <div className="flex flex-col gap-2">
        {selectedTowerEntity.activeSynergies.map((s) => {
          const def = SYNERGIES[s.type];
          return (
            <div
              key={`${s.type}:${s.partnerId}`}
              className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-950/20 p-2 rounded border border-cyan-900/50"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_currentColor]" />
              <span className="font-bold uppercase tracking-wider text-[10px]">{def.name}</span>
              <span className="hidden sm:inline w-px h-3 bg-cyan-900/50 mx-1"></span>
              <span className="text-cyan-500 text-[10px]">{def.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
