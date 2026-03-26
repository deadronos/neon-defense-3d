const fs = require('fs');
const file = 'src/game/engine/projectile.ts';
let code = fs.readFileSync(file, 'utf8');

// The original logic missed replacing one target.id reference in the fallback branch of AOE.
// Also we need to make sure we don't reference 'target.id' in the else branch directly.
code = code.replace(
  /\} else \{\n\s+if \(target\) \{\n\s+addHit\(hits, projectile\.targetId, projectile\.damage\);\n\s+applyFreeze\(freezeHits, projectile\.targetId, projectile\.freezeDuration\);\n\s+frameTotalDamage \+= projectile\.damage;\n\s+\}\n\s+\}/,
  `} else if (target) {
        addHit(hits, projectile.targetId, projectile.damage);
        applyFreeze(freezeHits, projectile.targetId, projectile.freezeDuration);
        frameTotalDamage += projectile.damage;
      }`
);

fs.writeFileSync(file, code);
