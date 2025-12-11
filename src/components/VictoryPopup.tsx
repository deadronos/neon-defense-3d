import React from 'react';
import { useGame } from '../game/GameState';

interface VictoryPopupProps {
  onOpenTechTree: () => void;
}

export const VictoryPopup: React.FC<VictoryPopupProps> = ({ onOpenTechTree }) => {
  const { gameState } = useGame();

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50 animate-in fade-in duration-500">
      <div className="bg-[#1a1a2e] border-4 border-[#e94560] p-8 rounded-lg text-center shadow-[0_0_30px_rgba(233,69,96,0.5)] transform scale-100 animate-in zoom-in duration-300">
        <h1 className="text-4xl font-bold text-[#e94560] mb-4 tracking-wider uppercase font-orbitron">
          Sector Cleared!
        </h1>
        <div className="mb-6 space-y-2">
          <p className="text-gray-300 text-lg">Hostiles neutralized. Proceed to upgrade station.</p>
          <p className="text-[#00f2ff] text-xl font-bold">
            Research Points: {Math.floor(gameState.researchPoints)}
          </p>
        </div>
        <button
          onClick={onOpenTechTree}
          className="bg-[#e94560] hover:bg-[#ff5777] text-white font-bold py-3 px-8 rounded shadow-[0_0_15px_rgba(233,69,96,0.4)] transition-all transform hover:scale-105"
        >
          Open Tech Tree
        </button>
      </div>
    </div>
  );
};
