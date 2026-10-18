/**
 * Measures the slide of the panda trombonist for turns of the slide and of the right shoulder
 * (round `trombone-fit`, 2026-10-18, motion spec T1): the slide angles below the level and to the
 * right of the front in the axes of the chest, the angle of the slide from the front, the slide
 * reach (`slideReach` of `windRig()`), and the right elbow flexion in the first and the seventh
 * position for an arm with a straight wrist (the law of cosines, as `arm-probe.ts` of the report
 * `2026-10-18-wind-technique`). The positions follow `slideTravel()`.
 * Usage: node docs/research/2026-10-18-trombone-fit/slide-probe.ts [<right>,<down>[,<shoulder>]]...
 * The turns are in degrees: the slide turns right, then down, around the mouthpiece, and the right
 * shoulder bone turns forward (`WindHold.reach`, 45 by default).
 */
import { MathUtils, Quaternion, Vector3 } from 'three';

import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { toQuat } from '../../../src/models/tuples.ts';
import type { Quat } from '../../../src/models/tuples.ts';
import { windGrips, windHoldOf, windRig } from '../../../src/pose/winds.ts';

const model = buildPlayer('panda', 'trombone');
const base = windHoldOf('panda', 'trombone');
const at = (bone: string): Vector3 =>
  new Vector3(...(model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0]));
const upper = at('upperArmR').distanceTo(at('forearmR'));
const rig0 = windRig(model, 'trombone', base);
const fore = at('forearmR').distanceTo(at('handR')) + new Vector3(...rig0.right.arm.palm).length();
const deg = MathUtils.RAD2DEG;

/**
 * Gives the elbow flexion of an arm that reaches a distance, with a straight wrist.
 *
 * @param d The distance from the shoulder joint to the middle of the palm.
 * @returns The flexion in degrees: 0 is a straight arm.
 */
function flexion(d: number): number {
  const c = (upper * upper + fore * fore - d * d) / (2 * upper * fore);
  return 180 - Math.acos(Math.min(1, Math.max(-1, c))) * deg;
}

/**
 * Gives the turn of the slide for a turn to the right and a turn down around the mouthpiece.
 *
 * @param right The turn to the right, in degrees.
 * @param down The turn down, in degrees.
 * @returns The rotation of the `play` field of a wind hold.
 */
function playTurn(right: number, down: number): Quat {
  return toQuat(
    new Quaternion()
      .setFromAxisAngle(new Vector3(0, 1, 0), -right * MathUtils.DEG2RAD)
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -down * MathUtils.DEG2RAD)),
  );
}

const real = (n: number): number => (2 ** ((n - 1) / 12) - 1) / (2 ** (6 / 12) - 1);
const args = process.argv.slice(2);
const variants = args.length
  ? args.map((a) => a.split(',').map(Number))
  : [
      [20, 25],
      [35, 15],
      [30, 20],
      [38, 12],
      [40, 10],
      [45, 5],
      [30, 15],
      [30, 15, 50],
      [30, 15, 55],
      [25, 15, 60],
      [30, 10, 65],
      [20, 15, 65],
    ];
console.log(`upper arm ${upper.toFixed(3)} m, forearm and palm ${fore.toFixed(3)} m`);
console.log(
  'right, down, shoulder (deg) | below the level, right of the front, from the front (deg) | slideReach (m) | right elbow in 1 and 7 (deg) | play',
);
for (const [right = 0, down = 0, shoulder = 45] of variants) {
  const play = playTurn(right, down);
  const rig = windRig(model, 'trombone', { ...base, play, reach: shoulder * MathUtils.DEG2RAD });
  const v = new Vector3(...rig.slideAxis).applyQuaternion(new Quaternion(...play));
  const below = Math.asin(-v.y) * deg;
  const side = Math.atan2(v.x, -v.z) * deg;
  const front = Math.acos(-v.z) * deg;
  const grips = windGrips(rig, 1);
  const joint = new Vector3(...grips.R.joint);
  const d = (s: number): number =>
    new Vector3(...grips.R.grip).addScaledVector(v, s * rig.slideReach).distanceTo(joint);
  const e1 = flexion(d(real(1)));
  const e7 = flexion(d(real(7)));
  console.log(
    `  ${right}, ${down}, ${shoulder} | ${below.toFixed(1)}, ${side.toFixed(1)}, ${front.toFixed(1)} | ${rig.slideReach.toFixed(3)} | ${e1.toFixed(0)} to ${e7.toFixed(0)}, range ${(e1 - e7).toFixed(0)} | ${play.map((x) => x.toFixed(5)).join(',')}`,
  );
}
