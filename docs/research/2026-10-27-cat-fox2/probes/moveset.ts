/**
 * Prints the --set text of a move of the cat viola, as hold-scan makes it.
 * Usage: node scratch/moveset.ts yaw=<deg>,tilt=<deg>,side=<deg>,roll=<deg>,dx=<m>,dy=<m>,dz=<m>
 */
import { MathUtils, Quaternion, Vector3 } from 'three';
import { SPECIES_HOLDS } from '../src/pose/bowed-rig.ts';
import { STUDIO_BODIES } from '../src/models/studio-body.ts';

const m = new Map(process.argv[2]!.split(',').map((p) => [p.split('=')[0]!, Number(p.split('=')[1])]));
const at = (k: string): number => m.get(k) ?? 0;
const hold = SPECIES_HOLDS.cat!.viola!;
const H = STUDIO_BODIES['studio-cat']!.headHeight;
const deg = MathUtils.DEG2RAD;
let turn = new Quaternion()
  .setFromAxisAngle(new Vector3(0, 1, 0), at('yaw') * deg)
  .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -at('tilt') * deg))
  .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), at('side') * deg))
  .multiply(new Quaternion(...hold.playTurn));
if (at('roll') !== 0) {
  const axis = new Vector3(0, 1, 0).applyQuaternion(turn).normalize();
  turn = new Quaternion().setFromAxisAngle(axis, at('roll') * deg).multiply(turn);
}
const t = (v: readonly number[]): string => `[${v.map((x) => Number(x.toFixed(4))).join(',')}]`;
const shift = [hold.playShift[0] + at('dx') / H, hold.playShift[1] + at('dy') / H, hold.playShift[2] + at('dz') / H];
console.log(`viola@cat.playTurn=${t([turn.x, turn.y, turn.z, turn.w])};viola@cat.playShift=${t(shift)}`);
