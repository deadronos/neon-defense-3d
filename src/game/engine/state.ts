import type {
  EngineAction,
  EngineIdCounters,
  EnginePatch,
  EngineState,
  EngineTickResult,
} from './types';
import type { EngineEvent } from './events';
export const createInitialEngineState = (): EngineState => ({
  enemies: [],
  towers: [],
  projectiles: [],
  effects: [],
  wave: null,
  idCounters: { enemy: 0, tower: 0, projectile: 0, effect: 0 },
  pendingEvents: [],
});

export const applyEnginePatch = (state: EngineState, patch: EnginePatch): EngineState => ({
  enemies: patch.enemies ?? state.enemies,
  towers: patch.towers ?? state.towers,
  projectiles: patch.projectiles ?? state.projectiles,
  effects: patch.effects ?? state.effects,
  wave: patch.wave ?? state.wave,
  idCounters: { ...state.idCounters, ...patch.idCounters },
  pendingEvents: patch.pendingEvents ?? state.pendingEvents,
});

export const allocateId = (state: EngineState, key: keyof EngineIdCounters) => {
  const nextValue = state.idCounters[key] + 1;
  const id = `${key}-${nextValue}`;
  const nextCounters = { ...state.idCounters, [key]: nextValue };
  return { id, state: { ...state, idCounters: nextCounters } };
};

export const resolveEngineTick = (
  state: EngineState,
  result: EngineTickResult,
): { state: EngineState; immediateEvents: EngineEvent[] } => {
  const immediateEvents = [...state.pendingEvents, ...result.events.immediate];
  const clearedState = applyEnginePatch(state, { pendingEvents: [] });
  const nextState = applyEnginePatch(clearedState, {
    ...result.patch,
    pendingEvents: [...result.events.deferred],
  });

  return { state: nextState, immediateEvents };
};

export const removeEffectById = (state: EngineState, effectId: string): EngineState => ({
  ...state,
  effects: state.effects.filter((effect) => effect.id !== effectId),
});

export const engineReducer = (
  state: EngineState,
  action: EngineAction,
): { state: EngineState; immediateEvents: EngineEvent[] } => {
  switch (action.type) {
    case 'applyTickResult':
      return resolveEngineTick(state, action.result);
    case 'removeEffect':
      return { state: removeEffectById(state, action.effectId), immediateEvents: [] };
    default:
      return { state, immediateEvents: [] };
  }
};
