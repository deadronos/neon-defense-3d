import { useEffect } from 'react';
import type { MutableRefObject } from 'react';

import { loadCheckpoint, saveCheckpoint, serializeCheckpoint } from '../persistence';
import type { RuntimeStoreState } from '../stores/runtimeStore';

export const useAutosaveCheckpoint = (
  ui: RuntimeStoreState['runtime']['ui'],
  getRuntime: () => RuntimeStoreState['runtime'],
  lastAutosavedNonceRef: MutableRefObject<number>,
) => {
  // Autosave a Tier-B checkpoint once per WaveStarted event.
  useEffect(() => {
    const nonce = ui.waveStartedNonce;
    if (nonce === lastAutosavedNonceRef.current) return;
    lastAutosavedNonceRef.current = nonce;

    // Only autosave on WaveStarted events (nonce > 0) during active play.
    if (nonce <= 0) return;
    if (ui.gameStatus !== 'playing') return;

    const snapshot = getRuntime();
    const nextSave = serializeCheckpoint(snapshot.ui, snapshot.engine);

    // Dev StrictMode can double-run effects; skip duplicate writes for the same wave.
    const existing = loadCheckpoint();
    if (
      existing?.checkpoint.waveToStart === nextSave.checkpoint.waveToStart &&
      existing.ui.currentMapIndex === nextSave.ui.currentMapIndex
    ) {
      return;
    }

    saveCheckpoint(nextSave);
  }, [ui.waveStartedNonce, ui.gameStatus, getRuntime, lastAutosavedNonceRef]);
};
