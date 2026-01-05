import type {
  GameContextProps,
  GameUiContextProps,
  RenderStateContextProps,
  WorldContextProps,
} from './contextTypes';

export const buildGameContextValue = (
  params: Omit<GameContextProps, 'waveState'> & { waveState?: GameContextProps['waveState'] },
): GameContextProps => ({
  ...params,
  waveState: params.waveState ?? null,
});

export const buildGameUiValue = (
  params: Omit<GameUiContextProps, 'waveState'> & { waveState?: GameUiContextProps['waveState'] },
): GameUiContextProps => ({
  ...params,
  waveState: params.waveState ?? null,
});

export const buildRenderStateValue = (
  renderStateRef: RenderStateContextProps['renderStateRef'],
): RenderStateContextProps => ({ renderStateRef });

export const buildWorldValue = (params: WorldContextProps): WorldContextProps => params;
