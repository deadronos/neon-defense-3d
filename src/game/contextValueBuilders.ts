import type {
  GameUiContextProps,
  RenderStateContextProps,
  WorldContextProps,
} from './contextTypes';

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
