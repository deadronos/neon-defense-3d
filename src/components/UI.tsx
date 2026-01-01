import React, { useState, useEffect } from 'react';

import { useGame } from '../game/GameState';

import { TechTreeModal } from './TechTreeModal';
import { BuildMenu } from './ui/BuildMenu';
import { GameOverScreen } from './ui/GameOverScreen';
import { IdleScreen } from './ui/IdleScreen';
import { SettingsModal } from './ui/SettingsModal';
import { TopBar } from './ui/TopBar';
import { UpgradeInspector } from './ui/UpgradeInspector';
import { VictoryPopup } from './VictoryPopup';

/**
 * The main user interface overlay component.
 */
export const UI = () => {
  const {
    gameState,
    startGame,
    resetGame,
    selectedTower,
    setSelectedTower,
    selectedEntityId,
    towers,
    upgradeTower,
    sellTower,
    setSelectedEntityId,
    waveState,
    skipWave,
    startNextSector,
    gameSpeed,
    setGameSpeed,
  } = useGame();

  const [showTechTree, setShowTechTree] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Reset tech tree visibility when game status changes to playing or idle
  useEffect(() => {
    if (gameState.gameStatus === 'playing' || gameState.gameStatus === 'idle') {
      setShowTechTree(false);
    }
  }, [gameState.gameStatus]);

  // Close settings on major state transitions.
  useEffect(() => {
    setShowSettings(false);
  }, [gameState.gameStatus]);

  if (gameState.gameStatus === 'idle') {
    if (showTechTree) {
      return <TechTreeModal onClose={() => setShowTechTree(false)} />;
    }
    return <IdleScreen onStart={startGame} onOpenTechTree={() => setShowTechTree(true)} />;
  }

  if (gameState.gameStatus === 'gameover') {
    return <GameOverScreen wave={gameState.wave} onReset={resetGame} />;
  }

  // Victory / Tech Tree UI
  if (gameState.gameStatus === 'victory') {
    if (showTechTree) {
      return (
        <TechTreeModal
          onClose={() => setShowTechTree(false)}
          actionLabel="WARP TO NEXT SECTOR"
          onAction={startNextSector}
        />
      );
    }
    return <VictoryPopup onOpenTechTree={() => setShowTechTree(true)} />;
  }

  // Determine if we are inspecting a tower
  const selectedTowerEntity = selectedEntityId
    ? towers.find((t) => t.id === selectedEntityId)
    : null;
  const showBuildMenu = !selectedTowerEntity;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <TopBar
        lives={gameState.lives}
        money={gameState.money}
        wave={gameState.wave}
        waveState={waveState}
        onOpenSettings={() => setShowSettings(true)}
        onSkipWave={skipWave}
        gameSpeed={gameSpeed}
        onSetGameSpeed={setGameSpeed}
      />

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />

      {showBuildMenu && (
        <BuildMenu
          selectedTower={selectedTower}
          onSelectTower={setSelectedTower}
          money={gameState.money}
          upgrades={gameState.upgrades}
        />
      )}

      {selectedTowerEntity && (
        <UpgradeInspector
          selectedTowerEntity={selectedTowerEntity}
          upgrades={gameState.upgrades}
          money={gameState.money}
          onClose={() => setSelectedEntityId(null)}
          onUpgrade={upgradeTower}
          onSell={sellTower}
        />
      )}
    </div>
  );
};

export default UI;
