import React from 'react';

interface GameOverScreenProps {
  wave: number;
  onReset: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ wave, onReset }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-red-950/80 backdrop-blur-md z-10 animate-fade-in">
      <div className="text-center p-12 relative border border-red-500/50 bg-black/60">
        <h1 className="text-6xl font-black mb-4 text-red-500 tracking-widest drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
          CRITICAL FAILURE
        </h1>
        <p className="text-xl mb-8 font-mono text-red-200">
          WAVES CLEARED: <span className="text-3xl font-bold">{wave}</span>
        </p>
        <button
          onClick={onReset}
          className="group relative px-10 py-3 bg-transparent hover:bg-red-500/10 transition-all duration-300"
        >
          <div className="absolute inset-0 border border-red-500 skew-x-[-20deg]"></div>
          <span className="relative font-bold text-red-100 tracking-wider">REBOOT SYSTEM</span>
        </button>
      </div>
    </div>
  );
};
