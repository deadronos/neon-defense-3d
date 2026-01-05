import React from 'react';

import { ErrorBoundary } from './components/ErrorBoundary';
import { UI } from './components/UI';
import { AudioProvider } from './game/audio/AudioManager';
import { GameCanvas } from './game/GameCanvas';
import { useGame } from './game/gameContexts';
import { GameProvider } from './game/GameState';

/**
 * The inner content of the application.
 * Renders the 3D game canvas and the UI overlay within a full-screen container.
 */
const AppContent = () => {
  const { gameState } = useGame();
  return (
    <div className="relative w-full h-screen overflow-hidden select-none">
      <GameCanvas key={gameState.sessionNonce} />
      <UI />
    </div>
  );
};

/**
 * The root application component.
 * Wraps the application content in the GameProvider to manage global state.
 * ErrorBoundary catches any JavaScript errors in the component tree.
 *
 * @returns The main App component.
 */
const App = () => {
  return (
    <ErrorBoundary>
      <AudioProvider>
        <GameProvider>
          <AppContent />
        </GameProvider>
      </AudioProvider>
    </ErrorBoundary>
  );
};

export default App;
