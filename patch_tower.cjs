const fs = require('fs');
const file = 'src/game/engine/tower.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Update targeting loop to keep track of target position
// 2. Pass targetPosition to new projectile creation
// 3. Fix lastFired logic to keep sub-frame time

// First, fix the minDistanceSquared block to save the target's position
code = code.replace(
  /let targetId: string \| undefined;\n\s+let minDistanceSquared = Infinity;/g,
  `let targetId: string | undefined;
    let minDistanceSquared = Infinity;
    let targetPosition: EngineVector3 | undefined;`
);

code = code.replace(
  /if \(d2 <= rangeSquared && d2 < minDistanceSquared\) \{\n\s+minDistanceSquared = d2;\n\s+targetId = enemy\.id;\n\s+\}/g,
  `if (d2 <= rangeSquared && d2 < minDistanceSquared) {
            minDistanceSquared = d2;
            targetId = enemy.id;
            targetPosition = [position[0], position[1], position[2]];
          }`
);

// We need to fix the fallback else branch where spatialGrid is NOT used as well.
code = code.replace(
  /for \(const enemy of state\.enemies\) \{\n\s+writeEnemyWorldPosition\(scratchEnemyPos, enemy, pathWaypoints, tileSize\);\n\s+const d2 = distanceSquared\(towerPos, scratchEnemyPos\);\n\s+if \(d2 <= rangeSquared && d2 < minDistanceSquared\) \{\n\s+minDistanceSquared = d2;\n\s+targetId = enemy\.id;\n\s+\}\n\s+\}/g,
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

// Now update the object passed to newProjectiles.push
code = code.replace(
  /newProjectiles\.push\(\{\n\s+id: projectileId,\n\s+origin,\n\s+targetId,\n\s+speed: PROJECTILE_SPEED,\n\s+progress: 0,\n\s+damage: stats\.damage,\n\s+color,\n\s+freezeDuration: stats\.freezeDuration,\n\s+splashRadius: stats\.splashRadius,\n\s+\}\);/g,
  `newProjectiles.push({
      id: projectileId,
      origin,
      targetId,
      speed: PROJECTILE_SPEED,
      progress: 0,
      damage: stats.damage,
      color,
      freezeDuration: stats.freezeDuration,
      splashRadius: stats.splashRadius,
      lastTargetPosition: targetPosition,
    });`
);

// Now fix the lastFired bug
code = code.replace(
  /const nextTower: EngineTower = \{ \.\.\.tower, lastFired: context\.nowMs, targetId \};/g,
  `const nextLastFired = tower.lastFired + cooldownMs;
    // Prevent towers from firing too fast if they were idle for a long time
    const clampedLastFired = Math.max(context.nowMs - cooldownMs * 2, nextLastFired);
    const nextTower: EngineTower = { ...tower, lastFired: clampedLastFired, targetId };`
);

fs.writeFileSync(file, code);
