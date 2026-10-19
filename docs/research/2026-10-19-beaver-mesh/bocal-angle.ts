/**
 * Gives the angle of the end of the bocal of the bassoon above the level, and the lean of the
 * tube from the vertical, for play turns holdTurn(x, z) of the bassoon hold (design 5.3): the
 * bind turn of the bassoon (`woodwindRotation()` of `src/models/instruments/woodwinds.ts`, 35°
 * around z and -8° around x), then the play turn. The end of the bocal runs from its bend to the
 * reed (`bassoonParts()`): the bend of the drawing of `9a4613b4` is (0.06, 0.69, 0.09), and the
 * new bend (0.08, 0.78, 0.09). A real bocal brings the reed to the mouth "at a nearly horizontal
 * angle" (`docs/reference/wind-technique.md` 3). Usage:
 *
 *     node docs/research/2026-10-19-beaver-mesh/bocal-angle.ts <bx>,<by>,<bz> <x>,<z> ...
 */
import { MathUtils, Quaternion, Vector3 } from 'three';

const X = new Vector3(1, 0, 0);
const Z = new Vector3(0, 0, 1);
const deg = MathUtils.DEG2RAD;
const bind = new Quaternion()
  .setFromAxisAngle(Z, 35 * deg)
  .multiply(new Quaternion().setFromAxisAngle(X, -8 * deg));
const [bx = 0, by = 0, bz = 0] = (process.argv[2] ?? '').split(',').map(Number);
const bocalEnd = new Vector3(0.16 - bx, 0.7 - by, 0.125 - bz).normalize();
const tube = new Vector3(0, 1, 0);
for (const arg of process.argv.slice(3)) {
  const [x = 0, z = 0] = arg.split(',').map(Number);
  const play = new Quaternion()
    .setFromAxisAngle(X, x * deg)
    .multiply(new Quaternion().setFromAxisAngle(Z, z * deg));
  const turn = play.clone().multiply(bind);
  const end = bocalEnd.clone().applyQuaternion(turn);
  const up = tube.clone().applyQuaternion(turn);
  // The bocal goes from the bend to the reed: a positive angle rises toward the mouth.
  const rise = Math.asin(end.y) / deg;
  const lean = Math.acos(up.y) / deg;
  console.log(
    `bend (${bx}, ${by}, ${bz}), holdTurn(${x}, ${z}): the end of the bocal rises ${rise.toFixed(1)}° to the reed, ` +
      `the tube leans ${lean.toFixed(1)}° from the vertical, top toward (${up.x.toFixed(2)}, ` +
      `${up.y.toFixed(2)}, ${up.z.toFixed(2)})`,
  );
}
