import { useEffect, useRef } from 'react';

import { saveCheckpoint, serializeCheckpoint } from '../persistence';
import type { RuntimeStoreState } from '../stores/runtimeStore';

export const useAutosaveCheckpoint = (
  ui: RuntimeStoreState['runtime']['ui'],
  getRuntime: () => RuntimeStoreState['runtime'],
) => {
  const lastAutosaved = useRef<string>(null);
  const { sessionNonce, waveStartedNonce, gameStatus } = ui;

  useEffect(() => {
    if (waveStartedNonce <= 0 || gameStatus !== 'playing') return;
    const key = `${sessionNonce}:${waveStartedNonce}`;
    if (lastAutosaved.current === key) return;

    const snapshot = getRuntime();
    saveCheckpoint(serializeCheckpoint(snapshot.ui, snapshot.engine));
    lastAutosaved.current = key;
  }, [sessionNonce, waveStartedNonce, gameStatus, getRuntime]);
};
