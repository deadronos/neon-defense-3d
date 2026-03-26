const fs = require('fs');

const file = 'src/game/engine/types.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /export interface EngineProjectile \{[\s\S]*?\}/,
  `export interface EngineProjectile {
  id: string;
  origin: EngineVector3;
  targetId: string;
  speed: number;
  progress: number;
  damage: number;
  color: string;
  freezeDuration?: number;
  splashRadius?: number;
  lastTargetPosition?: EngineVector3;
}`
);

fs.writeFileSync(file, code);
