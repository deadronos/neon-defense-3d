import React from 'react';

import { TOWER_CONFIGS } from '../constants';
import { getTowerStats } from '../game/GameCanvas'; // Import helper
import { useGame } from '../game/GameState';
import { TowerType } from '../types';

const Tooltip = ({ text, className = '' }: { text: React.ReactNode; className?: string }) => (
  <div
    className={`absolute opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/95 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 pointer-events-none z-50 shadow-xl backdrop-blur-sm whitespace-nowrap -translate-y-1 group-hover:translate-y-0 ${className}`}
  >
    {text}
  </div>
);

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
  } = useGame();

  if (gameState.gameStatus === 'idle') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10 animate-fade-in">
        <div className="text-center p-8 bg-gray-900 border border-purple-500 rounded-2xl shadow-2xl shadow-purple-500/20 max-w-md transform transition-all hover:scale-105 duration-500">
          <h1 className="text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 animate-pulse">
            NEON DEFENSE
          </h1>
          <p className="text-gray-400 mb-8">Defend the core. Survive the waves.</p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white font-bold 
              hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-cyan-500/50"
          >
            START MISSION
          </button>
        </div>
      </div>
    );
  }

  if (gameState.gameStatus === 'gameover') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-red-900/40 backdrop-blur-md z-10 animate-fade-in">
        <div className="text-center p-8 bg-gray-900 border border-red-500 rounded-2xl shadow-2xl shadow-red-500/20 transform transition-all hover:scale-105 duration-500">
          <h1 className="text-5xl font-bold mb-4 text-red-500 animate-bounce">CRITICAL FAILURE</h1>
          <p className="text-xl mb-4">Wave Reached: {gameState.wave}</p>
          <button
            onClick={resetGame}
            className="px-8 py-3 bg-red-600 rounded-full text-white font-bold 
            hover:bg-red-500 hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-red-500/50"
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  // Determine if we are inspecting a tower
  const selectedTowerEntity = selectedEntityId
    ? towers.find((t) => t.id === selectedEntityId)
    : null;
  const showBuildMenu = !selectedTowerEntity;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top Bar */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-start pointer-events-auto">
        <div className="flex gap-4">
          <div className="group relative bg-gray-900/80 backdrop-blur border border-gray-700 px-4 py-2 rounded-lg flex flex-col items-center min-w-[100px] transition-all duration-300 hover:border-green-500/50 hover:bg-gray-800 hover:scale-105 cursor-default shadow-lg">
            <span className="text-xs text-gray-400 uppercase">Health</span>
            <span
              className={`text-2xl font-bold ${
                gameState.lives < 10 ? 'text-red-500' : 'text-green-400'
              }`}
            >
              {gameState.lives}
            </span>
            <Tooltip
              text="If this reaches 0, the mission fails."
              className="top-full mt-2 left-1/2 -translate-x-1/2"
            />
          </div>
          <div className="group relative bg-gray-900/80 backdrop-blur border border-gray-700 px-4 py-2 rounded-lg flex flex-col items-center min-w-[100px] transition-all duration-300 hover:border-yellow-500/50 hover:bg-gray-800 hover:scale-105 cursor-default shadow-lg">
            <span className="text-xs text-gray-400 uppercase">Credits</span>
            <span className="text-2xl font-bold text-yellow-400">${gameState.money}</span>
            <Tooltip
              text="Earn credits by destroying enemies."
              className="top-full mt-2 left-1/2 -translate-x-1/2"
            />
          </div>
          <div className="group relative bg-gray-900/80 backdrop-blur border border-gray-700 px-4 py-2 rounded-lg flex flex-col items-center min-w-[100px] transition-all duration-300 hover:border-cyan-500/50 hover:bg-gray-800 hover:scale-105 cursor-default shadow-lg">
            <span className="text-xs text-gray-400 uppercase">Wave</span>
            <span className="text-2xl font-bold text-cyan-400">{gameState.wave}</span>
            <Tooltip
              text="Enemies get stronger each wave."
              className="top-full mt-2 left-1/2 -translate-x-1/2"
            />
          </div>
        </div>
      </div>

      {/* Build Menu (Bottom) */}
      {showBuildMenu && (
        <div className="absolute bottom-8 w-full flex justify-center pointer-events-auto">
          <div className="bg-gray-900/90 backdrop-blur border border-gray-700 p-2 rounded-2xl flex gap-2 shadow-2xl transition-all duration-300 hover:border-gray-500 hover:shadow-purple-500/10">
            {Object.values(TowerType).map((type) => {
              const config = TOWER_CONFIGS[type];
              const isSelected = selectedTower === type;
              const canAfford = gameState.money >= config.cost;

              return (
                <button
                  key={type}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTower(null);
                    } else if (canAfford) {
                      setSelectedTower(type);
                    }
                  }}
                  className={`
                    relative group flex flex-col items-center p-3 rounded-xl transition-all duration-200 w-24
                    ${
                      isSelected
                        ? 'bg-gray-700 ring-2 ring-cyan-400 scale-105 -translate-y-2 shadow-cyan-500/20 shadow-lg'
                        : 'hover:bg-gray-800 hover:-translate-y-2'
                    }
                    ${!canAfford ? 'opacity-50 grayscale' : 'active:scale-95'}
                    ${!canAfford && !isSelected ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div
                    className="w-10 h-10 rounded-lg mb-2 shadow-lg transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
                    style={{ backgroundColor: config.color, boxShadow: `0 0 10px ${config.color}` }}
                  />
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {config.name}
                  </span>
                  <span
                    className={`text-xs transition-colors ${
                      canAfford ? 'text-yellow-300' : 'text-gray-500'
                    }`}
                  >
                    ${config.cost}
                  </span>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 w-48 bg-black/95 p-3 rounded-lg text-xs text-left border border-gray-700 pointer-events-none shadow-xl z-20 backdrop-blur-sm">
                    <p className="font-bold text-cyan-300 text-sm mb-1">{config.name}</p>
                    <p className="text-gray-300 mb-2 leading-tight">{config.description}</p>
                    <div className="grid grid-cols-2 gap-1 text-gray-400 font-mono text-[10px]">
                      <span className="flex justify-between">
                        <span>DMG:</span> <span className="text-white">{config.damage}</span>
                      </span>
                      <span className="flex justify-between">
                        <span>SPD:</span>{' '}
                        <span className="text-white">{(1 / config.cooldown).toFixed(1)}/s</span>
                      </span>
                      <span className="flex justify-between">
                        <span>RNG:</span> <span className="text-white">{config.range}</span>
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade Inspector (Right) */}
      {selectedTowerEntity && (
        <div className="absolute bottom-8 w-full flex justify-center pointer-events-auto">
          <div className="bg-gray-900/95 backdrop-blur border border-cyan-500/50 p-4 rounded-2xl flex gap-6 shadow-2xl min-w-[400px] animate-fade-in-up transition-all duration-300 hover:shadow-cyan-500/20 hover:border-cyan-400/80">
            {/* Info Column */}
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]"
                  style={{
                    background: TOWER_CONFIGS[selectedTowerEntity.type].color,
                    color: TOWER_CONFIGS[selectedTowerEntity.type].color,
                  }}
                />
                {TOWER_CONFIGS[selectedTowerEntity.type].name}
                <span className="text-sm bg-gray-800 px-2 py-0.5 rounded text-cyan-300 border border-gray-700 shadow-inner">
                  Lvl {selectedTowerEntity.level}
                </span>
              </h2>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-1">
                {(() => {
                  const current = getTowerStats(
                    selectedTowerEntity.type,
                    selectedTowerEntity.level,
                  );
                  const next = getTowerStats(
                    selectedTowerEntity.type,
                    selectedTowerEntity.level + 1,
                  );
                  return (
                    <>
                      <div className="text-gray-400 self-center relative group cursor-help border-b border-gray-700/50 hover:border-gray-500 border-dotted w-max">
                        Damage
                        <Tooltip
                          text="Health reduction per hit"
                          className="bottom-full mb-2 left-0"
                        />
                      </div>
                      <div className="text-white font-mono bg-black/30 px-2 py-0.5 rounded border border-gray-800">
                        {current.damage.toFixed(0)}{' '}
                        <span className="text-green-400 ml-1">→ {next.damage.toFixed(0)}</span>
                      </div>

                      <div className="text-gray-400 self-center relative group cursor-help border-b border-gray-700/50 hover:border-gray-500 border-dotted w-max">
                        Range
                        <Tooltip
                          text="Max targeting distance"
                          className="bottom-full mb-2 left-0"
                        />
                      </div>
                      <div className="text-white font-mono bg-black/30 px-2 py-0.5 rounded border border-gray-800">
                        {current.range.toFixed(1)}{' '}
                        <span className="text-green-400 ml-1">→ {next.range.toFixed(1)}</span>
                      </div>

                      <div className="text-gray-400 self-center relative group cursor-help border-b border-gray-700/50 hover:border-gray-500 border-dotted w-max">
                        Fire Rate
                        <Tooltip text="Attacks per second" className="bottom-full mb-2 left-0" />
                      </div>
                      <div className="text-white font-mono bg-black/30 px-2 py-0.5 rounded border border-gray-800">
                        {(1 / current.cooldown).toFixed(1)}{' '}
                        <span className="text-green-400 ml-1">
                          → {(1 / next.cooldown).toFixed(1)}/s
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Actions Column */}
            <div className="flex flex-col justify-between gap-2 border-l border-gray-700 pl-6">
              <button
                onClick={() => setSelectedEntityId(null)}
                className="text-xs text-gray-500 hover:text-white self-end mb-auto transition-all duration-200 hover:scale-110 active:scale-95"
              >
                CLOSE [X]
              </button>

              <div className="flex gap-2">
                {/* Sell Button */}
                <button
                  onClick={() => sellTower(selectedTowerEntity.id)}
                  className="relative group px-4 py-2 bg-red-900/40 hover:bg-red-800 border border-red-800/60 rounded-lg text-red-200 text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-red-900/20"
                >
                  SELL
                  <Tooltip
                    text="Refunds 70% of total value"
                    className="bottom-full mb-2 left-1/2 -translate-x-1/2"
                  />
                </button>

                {/* Upgrade Button */}
                {(() => {
                  const nextStats = getTowerStats(
                    selectedTowerEntity.type,
                    selectedTowerEntity.level + 1,
                  );
                  const canAfford = gameState.money >= nextStats.upgradeCost;
                  return (
                    <button
                      onClick={() => upgradeTower(selectedTowerEntity.id)}
                      disabled={!canAfford}
                      className={`
                              relative group flex flex-col items-center px-6 py-2 rounded-lg border transition-all duration-200
                              ${
                                canAfford
                                  ? 'bg-cyan-900/50 border-cyan-500 hover:bg-cyan-800 text-white hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-cyan-500/30'
                                  : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed opacity-70'
                              }
                            `}
                    >
                      <span className="font-bold uppercase text-sm">Upgrade</span>
                      <span className={`text-xs ${canAfford ? 'text-yellow-300' : ''}`}>
                        ${nextStats.upgradeCost}
                      </span>

                      <Tooltip
                        text={canAfford ? 'Upgrade stats' : 'Not enough credits'}
                        className="bottom-full mb-2 left-1/2 -translate-x-1/2"
                      />
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute top-20 right-4 w-64 text-right pointer-events-none opacity-50 transition-opacity hover:opacity-100 duration-500">
        <p className="text-sm text-white drop-shadow-md">Left Click to Place / Select</p>
        <p className="text-sm text-white drop-shadow-md">Right Click / Drag to Rotate</p>
        <p className="text-sm text-white drop-shadow-md">Scroll to Zoom</p>
      </div>
    </div>
  );
};
