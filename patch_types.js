const fs = require('node:fs');

const file = 'src/game/engine/types.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /export interface EngineProjectile {[\S\s]*?}/,
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
}`,
);

fs.writeFileSync(file, code);
