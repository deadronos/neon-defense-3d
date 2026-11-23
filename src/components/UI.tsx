import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

import { TOWER_CONFIGS } from '../constants';
import { useGameUi } from '../game/gameContexts';
import { TowerType } from '../types';

import { TechTreeModal } from './TechTreeModal';
import { BuildMenu } from './ui/BuildMenu';
import { GameOverScreen } from './ui/GameOverScreen';
import { IdleScreen } from './ui/IdleScreen';
import { KillStreakAnnouncer } from './ui/KillStreakAnnouncer';
import { SettingsModal } from './ui/SettingsModal';
import { TopBar } from './ui/TopBar';
import { UpgradeInspector } from './ui/UpgradeInspector';
import { useGameShortcut } from './ui/useGameShortcut';
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
    setTowerTargetingMode,
    sellTower,
    setSelectedEntityId,
    waveState,
    skipWave,
    startNextSector,
    gameSpeed,
    setGameSpeed,
    startRogueliteRun,
  } = useGameUi();

  const [showTechTree, setShowTechTree] = useState(false);
  const [settingsSpeed, setSettingsSpeed] = useState<number | null>(null);
  const showSettings = settingsSpeed !== null;
  const lastSpeed = useRef(1);
  const previousModalFocus = useRef<Element | null>(null);
  const selectedTowerEntity = towers.find((tower) => tower.id === selectedEntityId);
  const openSettings = () => {
    previousModalFocus.current = document.activeElement;
    setSettingsSpeed(gameSpeed);
  };
  const openTechTree = () => {
    previousModalFocus.current = document.activeElement;
    setShowTechTree(true);
  };
  const closeSettings = () => setSettingsSpeed(null);
  const closeTechTree = () => setShowTechTree(false);

  const togglePause = () => {
    if (gameSpeed !== 0) lastSpeed.current = gameSpeed;
    setGameSpeed(gameSpeed === 0 ? lastSpeed.current : 0);
  };

  useLayoutEffect(() => {
    if (settingsSpeed === null || settingsSpeed === 0) return;
    setGameSpeed(0);
    return () => setGameSpeed(settingsSpeed);
  }, [settingsSpeed, setGameSpeed]);

  const dismiss = () => {
    if (showSettings) closeSettings();
    else if (showTechTree) closeTechTree();
    else if (selectedTowerEntity) setSelectedEntityId(null);
    else if (selectedTower) setSelectedTower(null);
  };

  useGameShortcut((event) => {
    if (event.key === 'Escape') {
      dismiss();
      return;
    }
    if (gameState.gameStatus !== 'playing' || showSettings || showTechTree) return;
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault();
      togglePause();
      return;
    }
    if (!/^[1-5]$/.test(event.key)) return;
    const type = Object.values(TowerType)[Number(event.key) - 1];
    if (selectedTower !== type && gameState.money < TOWER_CONFIGS[type].cost) return;
    setSelectedEntityId(null);
    setSelectedTower(selectedTower === type ? null : type);
  });

  useEffect(() => {
    setShowTechTree(false);
    setSettingsSpeed(null);
  }, [gameState.gameStatus]);

  if (gameState.gameStatus === 'gameover') {
    return <GameOverScreen wave={gameState.wave} onReset={resetGame} />;
  }

  const victory = gameState.gameStatus === 'victory';
  if (victory || gameState.gameStatus === 'idle') {
    return (
      <>
        <div inert={showTechTree}>
          {victory ? (
            <VictoryPopup onOpenTechTree={openTechTree} />
          ) : (
            <IdleScreen
              onStart={startGame}
              onOpenTechTree={openTechTree}
              onStartRoguelite={startRogueliteRun}
            />
          )}
        </div>
        {showTechTree && (
          <TechTreeModal
            onClose={closeTechTree}
            restoreFocusTo={previousModalFocus.current}
            actionLabel={victory ? 'WARP TO NEXT SECTOR' : undefined}
            onAction={victory ? startNextSector : undefined}
          />
        )}
      </>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <div inert={showSettings}>
        <TopBar
          lives={gameState.lives}
          money={gameState.money}
          wave={gameState.wave}
          waveState={waveState}
          onOpenSettings={openSettings}
          onTogglePause={togglePause}
          location={
            gameState.gameMode === 'ROGUELITE'
              ? `PHASE ${gameState.roguePhase}`
              : `SECTOR ${gameState.currentMapIndex + 1}`
          }
          seed={gameState.gameMode === 'ROGUELITE' ? gameState.customMapSeed : null}
          onSkipWave={skipWave}
          gameSpeed={gameSpeed}
          onSetGameSpeed={setGameSpeed}
        />

        <KillStreakAnnouncer />

        {!selectedTowerEntity ? (
          <BuildMenu
            selectedTower={selectedTower}
            onSelectTower={setSelectedTower}
            money={gameState.money}
            upgrades={gameState.upgrades}
          />
        ) : null}

        {selectedTowerEntity ? (
          <UpgradeInspector
            selectedTowerEntity={selectedTowerEntity}
            upgrades={gameState.upgrades}
            money={gameState.money}
            onClose={() => setSelectedEntityId(null)}
            onUpgrade={upgradeTower}
            onTargetingMode={setTowerTargetingMode}
            onSell={sellTower}
            shortcutsEnabled={!showSettings}
          />
        ) : null}
      </div>
      <SettingsModal
        open={showSettings}
        onClose={closeSettings}
        restoreFocusTo={previousModalFocus.current}
      />
    </div>
  );
};

export default UI;
