const fs = require('fs');
const file = 'src/game/utils.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /damage: base\.damage \* \(1 \+ \(level - 1\) \* 0\.25\) \* dmgMult,/g,
  `damage: Math.floor(base.damage * Math.pow(1.5, level - 1) * dmgMult),`
);

fs.writeFileSync(file, code);
