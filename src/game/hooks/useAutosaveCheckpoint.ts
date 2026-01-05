import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { RuntimeStoreState } from '../stores/runtimeStore';
import { loadCheckpoint, saveCheckpoint, serializeCheckpoint } from '../persistence';

export const useAutosaveCheckpoint = (
  runtime: RuntimeStoreState['runtime'],
  runtimeRef: MutableRefObject<RuntimeStoreState['runtime']>,
  lastAutosavedNonceRef: MutableRefObject<number>,
) => {
  // Autosave a Tier-B checkpoint once per WaveStarted event.
  useEffect(() => {
    const nonce = runtime.ui.waveStartedNonce;
    if (nonce === lastAutosavedNonceRef.current) return;
    lastAutosavedNonceRef.current = nonce;

    // Only autosave on WaveStarted events (nonce > 0) during active play.
    if (nonce <= 0) return;
    if (runtime.ui.gameStatus !== 'playing') return;

    const snapshot = runtimeRef.current;
    const nextSave = serializeCheckpoint(snapshot.ui, snapshot.engine);

    // Dev StrictMode can double-run effects; skip duplicate writes for the same wave.
    const existing = loadCheckpoint();
    if (
      existing &&
      existing.checkpoint.waveToStart === nextSave.checkpoint.waveToStart &&
      existing.ui.currentMapIndex === nextSave.ui.currentMapIndex
    ) {
      return;
    }

    saveCheckpoint(nextSave);
  }, [runtime.ui.waveStartedNonce, runtime.ui.gameStatus, runtimeRef, lastAutosavedNonceRef]);
};
