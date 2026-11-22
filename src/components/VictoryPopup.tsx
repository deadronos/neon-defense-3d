import React from 'react';

import { useGameUi } from '../game/gameContexts';

interface VictoryPopupProps {
  onOpenTechTree: () => void;
}

export const VictoryPopup: React.FC<VictoryPopupProps> = ({ onOpenTechTree }) => {
  const { gameState } = useGameUi();

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50 motion-safe:animate-in fade-in duration-500">
      <div className="bg-cyan-950/30 border-4 border-fuchsia-600 p-8 rounded-lg text-center shadow-[0_0_30px_rgba(217,70,239,0.5)] transform scale-100 motion-safe:animate-in zoom-in duration-300">
        <h1 className="text-4xl font-bold text-fuchsia-600 mb-4 tracking-wider uppercase font-orbitron">
          Sector Cleared!
        </h1>
        <div className="mb-6 space-y-2">
          <p className="text-gray-300 text-lg">Hostiles neutralized. Proceed to upgrade station.</p>
          <p className="text-cyan-300 text-xl font-bold">
            Research Points: {Math.floor(gameState.researchPoints)}
          </p>
        </div>
        <button
          onClick={onOpenTechTree}
          className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3 px-8 rounded shadow-[0_0_15px_rgba(217,70,239,0.4)] transition-all transform motion-safe:hover:scale-105"
        >
          Open Tech Tree
        </button>
      </div>
    </div>
  );
};
