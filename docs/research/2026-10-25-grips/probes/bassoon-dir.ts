// Prints the direction of the bassoon tube (boot to bell) in the chest axes for play turns.
// Usage: node scratch/bassoon-dir.ts <x>,<z> ...
import { MathUtils, Quaternion, Vector3 } from 'three';
import { holdTurn } from '../src/pose/winds.ts';

const bind = new Quaternion()
  .setFromAxisAngle(new Vector3(0, 0, 1), 35 * MathUtils.DEG2RAD)
  .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -8 * MathUtils.DEG2RAD));
for (const arg of process.argv.slice(2)) {
  const [x, z] = arg.split(',').map(Number);
  const play = new Quaternion(...holdTurn(x ?? 0, z ?? 0));
  const up = new Vector3(0, 1, 0).applyQuaternion(bind).applyQuaternion(play);
  const fromVertical = Math.acos(up.y) * MathUtils.RAD2DEG;
  const left = Math.atan2(-up.x, up.y) * MathUtils.RAD2DEG;
  const back = Math.atan2(up.z, up.y) * MathUtils.RAD2DEG;
  console.log(
    `turn (${x}, ${z}): bell direction right ${up.x.toFixed(2)} up ${up.y.toFixed(2)} fwd ${(-up.z).toFixed(2)}; ${fromVertical.toFixed(0)}° from vertical, ${left.toFixed(0)}° to the left in the front view, top ${back.toFixed(0)}° back in the side view`,
  );
}
