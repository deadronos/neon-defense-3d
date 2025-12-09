import React from 'react';

import { TOWER_CONFIGS } from '../constants';
import { useGame } from '../game/GameState';
import { getTowerStats } from '../game/utils';
import { TowerType } from '../types';

/**
 * A helper component to display a tooltip on hover.
 */
const Tooltip = ({ text, className = '' }: { text: React.ReactNode; className?: string }) => (
  <div
    className={`absolute opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#000000] border border-cyan-500/50 text-cyan-100 text-xs px-2 py-1.5 pointer-events-none z-50 shadow-[0_0_15px_rgba(6,182,212,0.3)] backdrop-blur-md whitespace-nowrap -translate-y-1 group-hover:translate-y-0 ${className}`}
  >
    {text}
  </div>
);

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
  } = useGame();

  if (gameState.gameStatus === 'idle') {
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
          <button
            onClick={startGame}
            className="group relative px-12 py-4 bg-transparent overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
          >
            <div className="absolute inset-0 border border-purple-500 skew-x-[-20deg] bg-purple-900/10 group-hover:bg-purple-500/20 transition-all"></div>
            <span className="relative font-bold text-xl tracking-widest text-purple-100 group-hover:text-white">
              INITIATE
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (gameState.gameStatus === 'gameover') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-red-950/80 backdrop-blur-md z-10 animate-fade-in">
        <div className="text-center p-12 relative border border-red-500/50 bg-black/60">
          <h1 className="text-6xl font-black mb-4 text-red-500 tracking-widest drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
            CRITICAL FAILURE
          </h1>
          <p className="text-xl mb-8 font-mono text-red-200">
            WAVES CLEARED: <span className="text-3xl font-bold">{gameState.wave}</span>
          </p>
          <button
            onClick={resetGame}
            className="group relative px-10 py-3 bg-transparent hover:bg-red-500/10 transition-all duration-300"
          >
            <div className="absolute inset-0 border border-red-500 skew-x-[-20deg]"></div>
            <span className="relative font-bold text-red-100 tracking-wider">REBOOT SYSTEM</span>
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
      <div className="absolute top-0 w-full p-6 flex justify-between items-start pointer-events-auto">
        <div className="flex gap-6">
          <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-red-500 pl-4 pr-6 py-2 skew-x-[-10deg]">
            <div className="skew-x-[10deg] flex flex-col">
              <span className="text-[10px] text-red-400 uppercase tracking-wider">
                Sys.Integrity
              </span>
              <span
                className={`text-2xl font-bold font-mono ${gameState.lives < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}
              >
                {gameState.lives}%
              </span>
            </div>
          </div>

          <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-yellow-400 pl-4 pr-6 py-2 skew-x-[-10deg]">
            <div className="skew-x-[10deg] flex flex-col">
              <span className="text-[10px] text-yellow-500 uppercase tracking-wider">
                Resources
              </span>
              <span className="text-2xl font-bold font-mono text-yellow-300">
                ${gameState.money}
              </span>
            </div>
          </div>

          <div className="relative bg-black/40 border-l-4 border-b border-r border-t border-t-transparent border-r-transparent border-b-transparent border-l-cyan-400 pl-4 pr-6 py-2 skew-x-[-10deg]">
            <div className="skew-x-[10deg] flex flex-col">
              <span className="text-[10px] text-cyan-500 uppercase tracking-wider">
                {waveState?.phase === 'preparing' ? 'NEXT WAVE' : 'WAVE INDEX'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono text-cyan-300">{gameState.wave}</span>
                {waveState?.phase === 'preparing' && waveState.timer > 0 && (
                  <span className="text-sm font-mono text-cyan-500 animate-pulse">
                    {waveState.timer.toFixed(1)}s
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Build Menu (Bottom) */}
      {showBuildMenu && (
        <div className="absolute bottom-10 w-full flex justify-center pointer-events-auto">
          <div
            className="bg-black/80 backdrop-blur-md border border-gray-800 p-4 flex gap-4 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            style={{
              clipPath:
                'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            }}
          >
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
                    relative group flex flex-col items-center p-3 transition-all duration-200 w-28 border
                    ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'border-gray-800 bg-transparent hover:border-gray-600 hover:bg-gray-900'
                    }
                    ${!canAfford ? 'opacity-40 grayscale' : ''}
                    ${!canAfford && !isSelected ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div
                    className="w-12 h-12 mb-3 shadow-lg transition-transform duration-300 group-hover:scale-110 flex items-center justify-center border border-white/10"
                    style={{ backgroundColor: `${config.color}22` }}
                  >
                    <div
                      className="w-6 h-6 rounded-full shadow-[0_0_10px_currentColor]"
                      style={{
                        backgroundColor: config.color,
                        boxShadow: `0 0 10px ${config.color}`,
                      }}
                    />
                  </div>

                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest group-hover:text-white transition-colors">
                    {config.name}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      canAfford ? 'text-yellow-400' : 'text-gray-600'
                    }`}
                  >
                    ${config.cost}
                  </span>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-6 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 w-48 bg-black/95 p-4 text-xs text-left border border-cyan-900 pointer-events-none shadow-2xl z-20 backdrop-blur-md">
                    <h3 className="font-bold text-cyan-400 text-sm mb-1 uppercase tracking-wider border-b border-cyan-900 pb-1">
                      {config.name}
                    </h3>
                    <p className="text-gray-400 mb-3 italic">{config.description}</p>
                    <div className="grid grid-cols-2 gap-y-1 text-gray-500 font-mono text-[10px]">
                      <span>
                        DMG: <span className="text-white">{config.damage}</span>
                      </span>
                      <span>
                        SPD:{' '}
                        <span className="text-white">{(1 / config.cooldown).toFixed(1)}/s</span>
                      </span>
                      <span className="col-span-2">
                        RNG: <span className="text-white">{config.range}M</span>
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
        <div className="absolute bottom-10 w-full flex justify-center pointer-events-auto">
          <div className="bg-black/90 backdrop-blur border-t-2 border-cyan-500/50 p-6 flex gap-8 shadow-2xl min-w-[500px] animate-fade-in-up">
            {/* Info */}
            <div className="flex flex-col gap-2 flex-grow">
              <div className="flex items-center gap-3 border-b border-gray-800 pb-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: TOWER_CONFIGS[selectedTowerEntity.type].color,
                    boxShadow: `0 0 10px ${TOWER_CONFIGS[selectedTowerEntity.type].color}`,
                  }}
                />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                  {TOWER_CONFIGS[selectedTowerEntity.type].name}
                </h2>
                <span className="ml-auto text-xs bg-cyan-900/40 text-cyan-300 px-2 py-0.5 border border-cyan-700/50 font-mono">
                  LVL {selectedTowerEntity.level}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 text-xs">
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
                      <div>
                        <div className="text-gray-500 uppercase tracking-widest text-[9px]">
                          Damage
                        </div>
                        <div className="font-mono text-white text-lg">
                          {current.damage.toFixed(0)}{' '}
                          <span className="text-green-500 text-xs">
                            +{(next.damage - current.damage).toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 uppercase tracking-widest text-[9px]">
                          Range
                        </div>
                        <div className="font-mono text-white text-lg">
                          {current.range.toFixed(1)}{' '}
                          <span className="text-green-500 text-xs">
                            +{(next.range - current.range).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 uppercase tracking-widest text-[9px]">
                          Rate
                        </div>
                        <div className="font-mono text-white text-lg">
                          {(1 / current.cooldown).toFixed(1)}{' '}
                          <span className="text-green-500 text-xs text-[10px]">UP</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 min-w-[140px] border-l border-gray-800 pl-6 justify-center">
              <button
                className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest text-right mb-auto"
                onClick={() => setSelectedEntityId(null)}
              >
                Close [ESC]
              </button>

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
                                relative group flex flex-col items-center justify-center p-2 border transition-all duration-200
                                ${canAfford ? 'border-cyan-500 bg-cyan-900/20 hover:bg-cyan-500/20' : 'border-gray-800 opacity-50 cursor-not-allowed'}
                            `}
                  >
                    <span className="font-bold text-white text-sm uppercase tracking-wider">
                      Upgrade
                    </span>
                    <span
                      className={`text-xs font-mono ${canAfford ? 'text-cyan-300' : 'text-gray-500'}`}
                    >
                      ${nextStats.upgradeCost}
                    </span>
                  </button>
                );
              })()}

              <button
                onClick={() => sellTower(selectedTowerEntity.id)}
                className="mt-1 text-xs text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-500/50 px-2 py-1 transition-colors uppercase tracking-wider"
              >
                Sell Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UI;
