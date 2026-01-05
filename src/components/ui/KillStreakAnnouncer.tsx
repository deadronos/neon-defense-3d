import React, { useEffect, useState } from 'react';
import { useGame } from '../../game/GameState';

export const KillStreakAnnouncer: React.FC = () => {
  const { gameState, clearAnnouncement } = useGame();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(gameState.announcement);

  useEffect(() => {
    if (gameState.announcement) {
      setCurrent(gameState.announcement);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        clearAnnouncement();
      }, 2000); // Hide after 2s
      return () => clearTimeout(timer);
    }
  }, [gameState.announcement, clearAnnouncement]);

  if (!visible || !current) return null;

  return (
    <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 flex flex-col items-center">
      <h1 className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300 stroke-cyan-500 animate-bounce-in drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]"
          style={{ 
            fontFamily: '"Black Ops One", "Arial Black", sans-serif',
            WebkitTextStroke: '1px #00ffff',
            textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff'
          }}>
        {current.text}
      </h1>
      {current.subtext && (
        <div className="text-2xl font-bold text-yellow-400 mt-2 animate-pulse" 
             style={{ textShadow: '0 0 10px #ffaa00' }}>
          {current.subtext}
        </div>
      )}
    </div>
  );
};
