import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { TILE_SIZE } from '../../constants';
import { UpgradeType } from '../../types';
import type { EngineVector2 } from '../engine/types';
import { stepEngine } from '../engine/step';
import type { EngineCache } from '../engine/step';
import type { RenderStateStoreState } from '../stores/renderStateStore';
import type { RuntimeStoreState } from '../stores/runtimeStore';
import { syncRenderState } from '../renderStateUtils';
import type { buildEnemyTypeMap } from '../transforms';

type PlaySfx = (id: string) => void;

interface UseGameStepParams {
  runtimeRef: MutableRefObject<RuntimeStoreState['runtime']>;
  renderStateRef: RenderStateStoreState['renderStateRef'];
  dispatch: RuntimeStoreState['dispatch'];
  enginePathWaypoints: readonly EngineVector2[];
  enemyTypeMap: ReturnType<typeof buildEnemyTypeMap>;
  gameSpeed: number;
  playSFX: PlaySfx;
}

export const useGameStep = ({
  runtimeRef,
  renderStateRef,
  dispatch,
  enginePathWaypoints,
  enemyTypeMap,
  gameSpeed,
  playSFX,
}: UseGameStepParams) => {
  const engineCacheRef = useRef<EngineCache>({
    projectileHits: new Map(),
    projectileFreeze: new Map(),
    activeProjectiles: [],
    enemiesById: new Map(),
    enemyPositions: new Map(),
    enemyPositionPool: [],
    nextEnemies: [],
    pathSegmentLengths: [],
    scratchEnemyPos: [0, 0, 0],
  });

  const killStreakRef = useRef({ count: 0, lastTime: 0 });

  const step = useCallback(
    (deltaSeconds: number, nowSeconds: number) => {
      const snapshot = runtimeRef.current;
      if (snapshot.ui.gameStatus !== 'playing') return;

      const deltaMs = deltaSeconds * 1000 * gameSpeed;
      const nowMs = nowSeconds * 1000;
      const greedLevel = snapshot.ui.upgrades?.[UpgradeType.GLOBAL_GREED] || 0;
      const greedMultiplier = 1 + greedLevel * 0.05;

      const result = stepEngine(
        snapshot.engine,
        enginePathWaypoints,
        { deltaMs, nowMs, rng: Math.random },
        { tileSize: TILE_SIZE, greedMultiplier, upgrades: snapshot.ui.upgrades },
        engineCacheRef.current,
      );

      // --- Sync Engine State to Mutable Render State ---
      syncRenderState(result.state, renderStateRef.current, {
        enemyTypeMap,
        pathWaypoints: enginePathWaypoints,
        tileSize: TILE_SIZE,
      });

      // Process engine events for Audio
      if (result.events.immediate.length > 0 || result.events.deferred.length > 0) {
        const allEvents = [...result.events.immediate, ...result.events.deferred];

        // Kill Streak Logic
        let killsThisTick = 0;
        allEvents.forEach((e) => {
          if (e.type === 'EffectSpawned') {
            playSFX('impact');
          } else if (e.type === 'ProjectileFired') {
            playSFX('shoot');
          } else if (e.type === 'EnemyKilled') {
            killsThisTick++;
          }
        });

        if (killsThisTick > 0) {
          const streakState = killStreakRef.current;
          const timeSinceLast = nowSeconds - streakState.lastTime;

          if (timeSinceLast < 1.5) {
            streakState.count += killsThisTick;
          } else {
            streakState.count = killsThisTick;
          }
          streakState.lastTime = nowSeconds;

          let announcementText = '';
          let subtext = '';

          // Determine announcement
          // Simple thresholds for now
          if (streakState.count === 2) {
            announcementText = 'DOUBLE KILL';
          } else if (streakState.count === 3) {
            announcementText = 'TRIPLE KILL';
          } else if (streakState.count === 4) {
            announcementText = 'QUADRA KILL';
          } else if (streakState.count === 5) {
            announcementText = 'PENTA KILL';
          } else if (streakState.count > 5) {
            announcementText = 'RAMPAGE';
            subtext = `${streakState.count} KILLS!`;
          }

          if (announcementText) {
            dispatch({
              type: 'uiAction',
              action: {
                type: 'setAnnouncement',
                announcement: {
                  text: announcementText,
                  subtext,
                  id: Date.now(),
                },
              },
            });
          }
        }
      }

      dispatch({ type: 'applyTickResult', result });
    },
    [dispatch, enemyTypeMap, enginePathWaypoints, gameSpeed, playSFX, renderStateRef, runtimeRef],
  );

  return { step };
};
