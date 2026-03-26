const fs = require('fs');
const file = 'src/game/engine/projectile.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace the loop logic to handle target absence, and use real distance
code = code.replace(
  /for \(const projectile of state\.projectiles\) \{\n\s+const target = enemiesById\.get\(projectile\.targetId\);\n\s+if \(!target\) continue;\n\n\s+const nextProgress = projectile\.progress \+ deltaSeconds \* PROJECTILE_PROGRESS_RATE;/g,
  `for (const projectile of state.projectiles) {
    const target = enemiesById.get(projectile.targetId);
    let targetPos = projectile.lastTargetPosition ?? projectile.origin;
    if (target) {
      const p = enemyPositions.get(target.id) ?? ensureEnemyPosition(target, impactContext);
      targetPos = [p[0], p[1], p[2]];
    } else if (!projectile.lastTargetPosition) {
       continue;
    }
    const dist = Math.hypot(
        targetPos[0] - projectile.origin[0],
        targetPos[1] - projectile.origin[1],
        targetPos[2] - projectile.origin[2]
    );
    const progressRate = dist > 0 ? projectile.speed / dist : 1;

    const nextProgress = projectile.progress + deltaSeconds * progressRate;

    // Always persist the updated known position
    const updatedProjectile = { ...projectile, lastTargetPosition: targetPos, progress: nextProgress };`
);

// We need to fix the 'target' check later when nextProgress >= 1
// And when updating activeProjectiles
code = code.replace(
  /if \(nextProgress >= 1\) \{/g,
  `if (nextProgress >= 1) {`
);

code = code.replace(
  /const impactPos =\n\s+enemyPositions\.get\(target\.id\) \?\? ensureEnemyPosition\(target, impactContext\);/g,
  `const impactPos = targetPos;`
);

// Fallback logic for when target is gone but the projectile hits
code = code.replace(
  /addHit\(hits, projectile\.targetId, projectile\.damage\);\n\s+applyFreeze\(freezeHits, projectile\.targetId, projectile\.freezeDuration\);\n\s+frameTotalDamage \+= projectile\.damage;/g,
  `if (target) {
          addHit(hits, projectile.targetId, projectile.damage);
          applyFreeze(freezeHits, projectile.targetId, projectile.freezeDuration);
          frameTotalDamage += projectile.damage;
        }`
);

// activeProjectiles.push({ ...projectile, progress: nextProgress });
code = code.replace(
  /activeProjectiles\.push\(\{ \.\.\.projectile, progress: nextProgress \}\);/g,
  `activeProjectiles.push(updatedProjectile);`
);

fs.writeFileSync(file, code);
