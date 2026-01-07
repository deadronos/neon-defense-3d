import React from 'react';

interface IdleScreenProps {
  onStart: () => void;
  onOpenTechTree?: () => void;
}

export const IdleScreen: React.FC<IdleScreenProps> = ({ onStart, onOpenTechTree }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10 animate-fade-in">
      <div className="text-center p-12 bg-black/40 border-y-2 border-cyan-500/50 relative transform transition-all hover:scale-105 duration-500">
        {/* Decorative lines */}
        <div className="absolute top-0 left-0 w-4 h-full border-l-2 border-cyan-500/30"></div>
        <div className="absolute top-0 right-0 w-4 h-full border-r-2 border-cyan-500/30"></div>

        <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-white to-purple-500 animate-pulse tracking-widest drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
          NEON DEFENSE
        </h1>
        <p className="text-cyan-200/70 mb-12 tracking-widest text-sm uppercase">
          Protocol: Survive // Execute
        </p>
        <div className="flex flex-col gap-6 items-center">
          <button
            onClick={onStart}
            className="group relative px-12 py-4 bg-transparent overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
          >
            <div className="absolute inset-0 border border-purple-500 skew-x-[-20deg] bg-purple-900/10 group-hover:bg-purple-500/20 transition-all"></div>
            <span className="relative font-bold text-xl tracking-widest text-purple-100 group-hover:text-white">
              INITIATE
            </span>
          </button>

          {onOpenTechTree ? (
            <button
              onClick={onOpenTechTree}
              className="px-8 py-2 bg-transparent border-b border-cyan-500/30 text-cyan-400 hover:text-cyan-200 hover:border-cyan-400 transition-colors tracking-widest text-sm font-bold uppercase"
            >
              Research Lab
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
