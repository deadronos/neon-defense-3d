import React from 'react';

import type { TowerEntity, UpgradeType } from '../../types';
import { Card } from '../ui/card';

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
    <div className="absolute bottom-36 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 pointer-events-auto z-20">
      <Card className="bg-black/90 backdrop-blur-md border-cyan-500/30 p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-8 shadow-[0_0_30px_rgba(0,0,0,0.6)] animate-fade-in-up">
        {/* Info */}
        <div className="flex flex-col gap-2 flex-grow min-w-0">
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
      </Card>
    </div>
  );
};
