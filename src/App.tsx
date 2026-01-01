import React from 'react';

import { UI } from './components/UI';
import { GameCanvas } from './game/GameCanvas';
import { AudioProvider } from './game/audio/AudioManager';
import { GameProvider } from './game/GameState';

/**
 * The inner content of the application.
 * Renders the 3D game canvas and the UI overlay within a full-screen container.
 */
const AppContent = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden select-none">
      <GameCanvas />
      <UI />
    </div>
  );
};

/**
 * The root application component.
 * Wraps the application content in the GameProvider to manage global state.
 *
 * @returns The main App component.
 */
const App = () => {
  return (
    <AudioProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </AudioProvider>
  );
};

export default App;
