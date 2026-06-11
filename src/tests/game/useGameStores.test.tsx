import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useGameStores } from '../../game/hooks/useGameStores';
import { createBattleStore } from '../../game/stores/battleStore';
import { createUiStore } from '../../game/stores/uiStore';

describe('useGameStores', () => {
  it('creates separate battle and UI stores for the runtime bridge', () => {
    const battleStore = createBattleStore();
    const uiStore = createUiStore();

    expect(battleStore.getState().engine).toBeDefined();
    expect(uiStore.getState().ui).toBeDefined();
  });

  it('keeps the runtime view in sync after UI actions', () => {
    const { result } = renderHook(() => useGameStores());

    act(() => {
      result.current.dispatch({
        type: 'uiAction',
        action: { type: 'setGraphicsQuality', quality: 'high' },
      });
    });

    expect(result.current.runtime.ui.graphicsQuality).toBe('high');
    expect(result.current.runtime.engine.towers).toHaveLength(0);
  });
});
