import { useMemo } from 'react';

import { RollingFrameStats, type FrameStatsConfig } from './frameStats';

const DEFAULT_WINDOW_MS = 1000;

/** React hook returning a stable RollingFrameStats instance.
 *
 *  Module-private: used by `DynamicResScaler`. Not re-exported from
 *  any barrel. Consumers that want a public hook can wrap this later.
 */
export function useFrameStats(config: FrameStatsConfig = {}): RollingFrameStats {
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;
  return useMemo(() => new RollingFrameStats({ windowMs }), [windowMs]);
}
