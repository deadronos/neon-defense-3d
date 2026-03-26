const fs = require('fs');

const file = 'src/tests/game/engine/engine-tower.test.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  /expect\(result\.patch\.towers\?\\.\[0\]\?\\.lastFired\)\.toBe\(800\);/,
  `expect(result.patch.towers?.[0]?.lastFired).toBe(basicCooldownMs);`
);
fs.writeFileSync(file, code);
