import React from 'react';

import { UI } from './components/UI';
import { GameCanvas } from './game/GameCanvas';
import { GameProvider } from './game/GameState';

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
