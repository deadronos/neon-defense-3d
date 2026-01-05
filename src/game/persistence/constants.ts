import { TowerType, UpgradeType } from '../../types';

export const knownTowerTypes = new Set<string>(Object.values(TowerType));
export const knownUpgradeKeys = new Set<string>(Object.values(UpgradeType));
