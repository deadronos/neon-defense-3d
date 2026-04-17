import type { MutableRefObject } from 'react';

import type {
  EffectEntity,
  EnemyEntity,
  GameState,
  GraphicsQuality,
  ProjectileEntity,
  TowerEntity,
  TowerType,
  TileType,
  UpgradeType,
  Vector2,
  WaveState,
} from '../types';

import type { SaveV1 } from './persistence';
import type { RenderState } from './renderStateUtils';

export interface GameContextProps {
  gameState: GameState;
  enemies: EnemyEntity[];
  towers: TowerEntity[];
  projectiles: ProjectileEntity[];
  effects: EffectEntity[];
  waveState: WaveState | null;
  step: (deltaSeconds: number, nowSeconds: number) => void;
  removeEffect: (id: string) => void;
  placeTower: (x: number, z: number, type: TowerType) => void;
  startGame: () => void;
  resetGame: () => void;
  selectedTower: TowerType | null;
  setSelectedTower: (t: TowerType | null) => void;
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  upgradeTower: (id: string) => void;
  sellTower: (id: string) => void;
  isValidPlacement: (x: number, z: number) => boolean;
  mapGrid: TileType[][];
  pathWaypoints: Vector2[];
  startNextSector: () => void;
  purchaseUpgrade: (type: UpgradeType, cost: number) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  resetCheckpoint: () => { ok: boolean; error?: string };
  factoryReset: () => void;
  applyCheckpointSave: (save: SaveV1) => void;
  exportCheckpointJson: () => { json: string; hasCheckpoint: boolean };
  skipWave: () => void;
  // Roguelite features
  startRogueliteRun: (seed: string) => void;
  nextRoguePhase: (seed: string) => void;
  setCustomMapLayout: (layout: number[][]) => void;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
  renderStateRef: MutableRefObject<RenderState>;
  clearAnnouncement: () => void;
}

export type GameUiContextProps = Omit<
  GameContextProps,
  | 'enemies'
  | 'towers'
  | 'projectiles'
  | 'effects'
  | 'mapGrid'
  | 'pathWaypoints'
  | 'isValidPlacement'
  | 'renderStateRef'
>;

export interface RenderStateContextProps {
  renderStateRef: MutableRefObject<RenderState>;
}

export interface WorldContextProps {
  mapGrid: TileType[][];
  currentMapIndex: number;
  placeTower: (x: number, z: number, type: TowerType) => void;
  isValidPlacement: (x: number, z: number) => boolean;
  selectedTower: TowerType | null;
  gameStatus: GameState['gameStatus'];
  setSelectedEntityId: (id: string | null) => void;
  renderStateRef: MutableRefObject<RenderState>;
}
