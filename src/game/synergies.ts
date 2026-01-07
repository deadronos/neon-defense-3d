import type { ActiveSynergy } from '../types';
import { SynergyType, TowerType } from '../types';

export interface SynergyDef {
  id: SynergyType;
  name: string;
  description: string;
}

export const SYNERGIES: Record<SynergyType, SynergyDef> = {
  [SynergyType.SYNCHRONIZED_FIRE]: {
    id: SynergyType.SYNCHRONIZED_FIRE,
    name: 'Synchronized Fire',
    description: '+15% Fire Rate',
  },
  [SynergyType.TRIANGULATION]: {
    id: SynergyType.TRIANGULATION,
    name: 'Triangulation',
    description: '+20% Range, +10% Critical Chance', // Updated description
  },
  [SynergyType.COVER_FIRE_SOURCE]: {
    id: SynergyType.COVER_FIRE_SOURCE,
    name: 'Cover Fire (Source)',
    description: '+10% Damage',
  },
  [SynergyType.COVER_FIRE_RECEIVER]: {
    id: SynergyType.COVER_FIRE_RECEIVER,
    name: 'Cover Fire (Received)',
    description: '+5% Range',
  },
};

/**
 * Calculates active synergies for all towers.
 */
/* eslint-disable sonarjs/cognitive-complexity */
export const calculateSynergies = (
  towers: { id: string; type: string; gridPosition: readonly [number, number] }[],
): Map<string, ActiveSynergy[]> => {
  const synergyMap = new Map<string, ActiveSynergy[]>();
  const towerMap = new Map<
    string,
    { id: string; type: string; gridPosition: readonly [number, number] }
  >();
  const gridMap = new Map<string, string>(); // "x,z" -> towerId

  for (const t of towers) {
    towerMap.set(t.id, t);
    gridMap.set(`${t.gridPosition[0]},${t.gridPosition[1]}`, t.id);
    synergyMap.set(t.id, []);
  }

  const getNeighbors = (x: number, z: number) => {
    const neighborIds: string[] = [];
    const offsets = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    for (const [dx, dz] of offsets) {
      const id = gridMap.get(`${x + dx},${z + dz}`);
      if (id) neighborIds.push(id);
    }
    return neighborIds;
  };

  for (const tower of towers) {
    const neighbors = getNeighbors(tower.gridPosition[0], tower.gridPosition[1]);
    const active: ActiveSynergy[] = [];

    for (const nid of neighbors) {
      const neighbor = towerMap.get(nid);
      if (!neighbor) continue;

      // 1. Synchronized Fire (Rapid + Rapid)
      if (tower.type === TowerType.Rapid && neighbor.type === TowerType.Rapid) {
        active.push({ type: SynergyType.SYNCHRONIZED_FIRE, partnerId: nid });
      }

      // 2. Triangulation (Sniper + Sniper)
      if (tower.type === TowerType.Sniper && neighbor.type === TowerType.Sniper) {
        active.push({ type: SynergyType.TRIANGULATION, partnerId: nid });
      }

      // 3. Cover Fire (Basic + Any)
      // Logic: If I am Basic, I get Source buff for every neighbor.
      if (tower.type === TowerType.Basic) {
        active.push({ type: SynergyType.COVER_FIRE_SOURCE, partnerId: nid });
      }
      // Logic: If neighbor is Basic, I get Receiver buff.
      // NOTE: If both are Basic, they get both Source and Receiver buffs from each other?
      // "Cover Fire (Basic + Any)" -> implies Basic works with anyone.
      // If Neighbor is Basic, I (Any) get Receiver.
      if (neighbor.type === TowerType.Basic) {
        active.push({ type: SynergyType.COVER_FIRE_RECEIVER, partnerId: nid });
      }
    }

    synergyMap.set(tower.id, active);
  }

  return synergyMap;
};
/* eslint-enable sonarjs/cognitive-complexity */
