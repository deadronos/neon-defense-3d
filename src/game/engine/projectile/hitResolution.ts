export const addHit = (hits: Map<string, number>, enemyId: string, damage: number) => {
  hits.set(enemyId, (hits.get(enemyId) ?? 0) + damage);
};

export const applyFreeze = (
  freezeHits: Map<string, number>,
  enemyId: string,
  freezeDuration: number | undefined,
) => {
  if (freezeDuration === undefined || freezeDuration <= 0) return;
  const current = freezeHits.get(enemyId) ?? 0;
  freezeHits.set(enemyId, Math.max(current, freezeDuration));
};
