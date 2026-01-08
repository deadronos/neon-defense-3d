import React from 'react';

import type { TowerEntity, UpgradeType } from '../../types';

import { InspectorActions } from './inspector/InspectorActions';
import { InspectorHeader } from './inspector/InspectorHeader';
import { InspectorStats } from './inspector/InspectorStats';
import { InspectorSynergies } from './inspector/InspectorSynergies';

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
      <div className="bg-black/90 backdrop-blur border-t-2 border-cyan-500/50 p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-8 shadow-2xl w-[min(98%,900px)] max-w-full animate-fade-in-up rounded-t-md">
        {/* Info */}
        <div className="flex flex-col gap-2 flex-grow">
          <InspectorHeader selectedTowerEntity={selectedTowerEntity} />
          <InspectorStats selectedTowerEntity={selectedTowerEntity} upgrades={upgrades} />
          <InspectorSynergies selectedTowerEntity={selectedTowerEntity} />
        </div>

        {/* Actions */}
        <InspectorActions
          selectedTowerEntity={selectedTowerEntity}
          upgrades={upgrades}
          money={money}
          onClose={onClose}
          onUpgrade={onUpgrade}
          onSell={onSell}
        />
      </div>
    </div>
  );
};
