// Prints the angle of the end of the bassoon bocal above the level for play turns.
import { MathUtils, Quaternion, Vector3 } from 'three';
import { holdTurn } from '../src/pose/winds.ts';

const bind = new Quaternion()
  .setFromAxisAngle(new Vector3(0, 0, 1), 35 * MathUtils.DEG2RAD)
  .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -8 * MathUtils.DEG2RAD));
for (const [x, z] of [
  [20, 20],
  [10, -5],
]) {
  const bend = Number(process.argv[2] ?? 0.78);
  const d = new Vector3(0.16 - 0.08, 0.7 - bend, 0.125 - 0.09)
    .applyQuaternion(bind)
    .applyQuaternion(new Quaternion(...holdTurn(x ?? 0, z ?? 0)));
  const up = Math.asin(-d.y / d.length()) * MathUtils.RAD2DEG;
  console.log(`turn (${x}, ${z}): the reed end ${up.toFixed(1)}° below the level, toward the reed`);
}
