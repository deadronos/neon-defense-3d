import React from 'react';
import { GameProvider, useGame } from './game/GameState';
import { GameCanvas } from './game/GameCanvas';
import { UI } from './components/UI';

// Wrapper to provide context to the inner components
const AppContent = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden select-none">
      <GameCanvas />
      <UI />
    </div>
  );
};

const App = () => {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
};

export default App;
