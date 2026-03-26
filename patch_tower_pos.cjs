const fs = require('fs');
const file = 'src/game/engine/tower.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /for \(const enemy of state\.enemies\) \{\n\s+writeEnemyWorldPosition\(scratchEnemyPos, enemy, pathWaypoints, tileSize\);\n\s+const d2 = distanceSquared\(towerPos, scratchEnemyPos\);\n\s+if \(d2 <= rangeSquared && d2 < minDistanceSquared\) \{\n\s+minDistanceSquared = d2;\n\s+targetId = enemy\.id;\n\s+targetPosition = \[position\[0\], position\[1\], position\[2\]\];\n\s+\}\n\s+\}/,
  `for (const enemy of state.enemies) {
        writeEnemyWorldPosition(scratchEnemyPos, enemy, pathWaypoints, tileSize);
        const d2 = distanceSquared(towerPos, scratchEnemyPos);
        if (d2 <= rangeSquared && d2 < minDistanceSquared) {
            minDistanceSquared = d2;
            targetId = enemy.id;
            targetPosition = [scratchEnemyPos[0], scratchEnemyPos[1], scratchEnemyPos[2]];
          }
      }`
);

fs.writeFileSync(file, code);
