const fs = require('fs');
const file = 'src/game/engine/wave.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove ENEMY_TYPES.BOSS from createWaveConfig
// 2. Add bossCount to createWaveConfig
code = code.replace(
  /if \(wave % 5 === 0\) types\.push\(ENEMY_TYPES\.BOSS\);\n\n\s+return \{ count, intervalMs, types \};/g,
  `const bossCount = wave % 5 === 0 ? Math.floor(wave / 5) : 0;
  return { count: count + bossCount, bossCount, intervalMs, types };`
);

// We also need to update createInitialWaveState and EngineWaveState to track boss info,
// or simply handle it during spawn loops by checking enemiesRemainingToSpawn vs bossCount.
// If enemiesRemainingToSpawn <= bossCount, we spawn a boss instead of a random type.

code = code.replace(
  /const spawnEnemy = \(\n\s+state: EngineState,\n\s+wave: number,\n\s+rng: \(\) => number,\n\s+idCounters: EngineIdCounters,\n\): \{ enemy: EngineEnemy; idCounters: EngineIdCounters \} => \{/g,
  `const spawnEnemy = (
  state: EngineState,
  wave: number,
  rng: () => number,
  idCounters: EngineIdCounters,
  isBoss: boolean = false
): { enemy: EngineEnemy; idCounters: EngineIdCounters } => {`
);

code = code.replace(
  /const config = createWaveConfig\(wave\);\n\s+const typeConfig = chooseEnemyType\(config\.types, rng\);/g,
  `const config = createWaveConfig(wave);
  const typeConfig = isBoss ? ENEMY_TYPES.BOSS : chooseEnemyType(config.types, rng);`
);

code = code.replace(
  /const spawnResult = spawnEnemy\(state, waveState\.wave, context\.rng, idCounters\);/g,
  `
      const config = createWaveConfig(waveState.wave);
      const isBoss = remaining <= config.bossCount;
      const spawnResult = spawnEnemy(state, waveState.wave, context.rng, idCounters, isBoss);`
);

fs.writeFileSync(file, code);
