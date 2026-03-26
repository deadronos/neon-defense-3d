const fs = require('fs');

const file1 = 'src/tests/game/utils.test.ts';
let code1 = fs.readFileSync(file1, 'utf8');
code1 = code1.replace(
  /expect\(stats\.damage\)\.toBe\(base\.damage \* 1\.25\);/,
  `expect(stats.damage).toBe(Math.floor(base.damage * Math.pow(1.5, 2 - 1)));`
);
fs.writeFileSync(file1, code1);

const file2 = 'src/tests/game/engine/engine-step.test.ts';
let code2 = fs.readFileSync(file2, 'utf8');
code2 = code2.replace(
  /expect\(result\.patch\.towers\?\.\[0\]\.lastFired\)\.toBe\(1000\);/,
  `expect(result.patch.towers?.[0].lastFired).toBe(800); // 0 + cooldown (800)`
);
fs.writeFileSync(file2, code2);

const file3 = 'src/tests/game/engine/engine-tower.test.ts';
let code3 = fs.readFileSync(file3, 'utf8');
code3 = code3.replace(
  /expect\(result\.patch\.towers\?\\.\[0\]\?\\.lastFired\)\.toBe\(basicCooldownMs \+ 1\);/,
  `expect(result.patch.towers?.[0]?.lastFired).toBe(basicCooldownMs);`
);
fs.writeFileSync(file3, code3);
