import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { TOWER_CONFIGS } from '../../constants';
import { getTowerStats } from '../../game/utils';
import { TowerType } from '../../types';
import type { UpgradeType } from '../../types';

interface BuildMenuProps {
  selectedTower: TowerType | null;
  onSelectTower: (type: TowerType | null) => void;
  money: number;
  upgrades: { [key in UpgradeType]?: number };
}

export const BuildMenu: React.FC<BuildMenuProps> = ({
  selectedTower,
  onSelectTower,
  money,
  upgrades,
}) => {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 pointer-events-auto z-20">
      <Card className="bg-black/80 backdrop-blur-md border-zinc-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <ScrollArea className="w-full whitespace-nowrap rounded-md border-none">
          <div className="flex w-max space-x-4 p-4">
            {Object.values(TowerType).map((type) => {
              const config = TOWER_CONFIGS[type];
              const isSelected = selectedTower === type;
              const canAfford = money >= config.cost;

              // Display base stats, assume level 1 and active upgrades
              const stats = getTowerStats(type, 1, { upgrades });

              return (
                <TooltipProvider key={type}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'relative h-auto w-28 flex flex-col items-center p-3 transition-all duration-200 border-2 rounded-xl bg-transparent hover:bg-zinc-900/50',
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-950/40'
                            : 'border-zinc-800 hover:border-zinc-600',
                          !canAfford && !isSelected && 'opacity-50 grayscale cursor-not-allowed',
                        )}
                        disabled={!canAfford && !isSelected}
                        onClick={() => {
                          if (isSelected) {
                            onSelectTower(null);
                          } else if (canAfford) {
                            onSelectTower(type);
                          }
                        }}
                      >
                        <div
                          className="w-10 h-10 mb-2 rounded-lg flex items-center justify-center border border-white/10 transition-transform group-hover:scale-110"
                          style={{ backgroundColor: `${config.color}22` }}
                        >
                          <div
                            className="w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]"
                            style={{
                              backgroundColor: config.color,
                              boxShadow: `0 0 10px ${config.color}`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                          {config.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] h-5 px-1.5 font-mono font-bold bg-zinc-900 border-zinc-700',
                            canAfford ? 'text-yellow-400' : 'text-zinc-500',
                          )}
                        >
                          ${config.cost}
                        </Badge>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-black/95 border-cyan-900 text-zinc-200 w-48 p-0 overflow-hidden"
                    >
                      <div className="p-3 border-b border-cyan-900/50 bg-cyan-950/20">
                        <h4 className="font-bold text-cyan-400 text-xs uppercase tracking-wider">
                          {config.name}
                        </h4>
                        <span className="text-[10px] text-zinc-400 italic">Level 1</span>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] text-zinc-400 mb-3 italic leading-tight">
                          {config.description}
                        </p>
                        <div className="grid grid-cols-2 gap-y-1 text-zinc-500 font-mono text-[10px]">
                          <span>
                            DMG: <span className="text-zinc-200">{stats.damage.toFixed(0)}</span>
                          </span>
                          <span>
                            SPD:{' '}
                            <span className="text-zinc-200">
                              {(1 / stats.cooldown).toFixed(1)}/s
                            </span>
                          </span>
                          <span className="col-span-2">
                            RNG: <span className="text-zinc-200">{stats.range.toFixed(1)}M</span>
                          </span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="bg-zinc-800/50" />
        </ScrollArea>
      </Card>
    </div>
  );
};
