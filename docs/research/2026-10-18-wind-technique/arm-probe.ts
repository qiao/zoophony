/**
 * Measures the right arm of the panda trombonist for each slide position (round `wind-research`,
 * 2026-10-18): the distance from the right shoulder joint to the slide grip in the playing pose
 * (`windGrips()` of `src/pose/winds.ts`), and the elbow flexion of an arm with a straight wrist
 * (the law of cosines on the upper arm and on the forearm with the palm). It also gives the slide
 * reach (`slideReach` of `windRig()`) and the slide angles for turns of the slide that are nearer
 * to the level (motion spec T1). The reach takes no clearance into account.
 * Usage: node docs/research/2026-10-18-wind-technique/arm-probe.ts
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

/**
 * Gives the slide direction in the playing pose: below the level and to the right, in degrees.
 *
 * @param axis The bind direction of the slide.
 * @param play The playing rotation of the hold.
 * @returns The two angles.
 */
function slideAngles(axis: readonly number[], play: Quat): [number, number] {
  const v = new Vector3(...axis).applyQuaternion(new Quaternion(...play));
  return [Math.asin(-v.y) * deg, Math.atan2(v.x, -v.z) * deg];
}

console.log(`upper arm ${upper.toFixed(3)} m, forearm and palm ${fore.toFixed(3)} m`);
const grips = windGrips(rig0, 1);
const joint = new Vector3(...grips.R.joint);
const axis = new Vector3(...rig0.slideAxis).applyQuaternion(new Quaternion(...base.play));
const real = (n: number): number => (2 ** ((n - 1) / 12) - 1) / (2 ** (6 / 12) - 1);
console.log(`slideReach ${rig0.slideReach.toFixed(3)} m`);
console.log('pos | equal: distance (m), elbow flexion (deg) | proportional: distance, flexion');
for (let n = 1; n <= 7; n++) {
  const d = (s: number): number =>
    new Vector3(...grips.R.grip).addScaledVector(axis, s * rig0.slideReach).distanceTo(joint);
  const e = d((n - 1) / 6);
  const p = d(real(n));
  console.log(
    `  ${n} | ${e.toFixed(3)}, ${flexion(e).toFixed(0)} | ${p.toFixed(3)}, ${flexion(p).toFixed(0)}`,
  );
}

console.log('T1: right, down | slide below the level, to the right | slideReach (m)');
for (const right of [20, 25, 30, 35]) {
  for (const down of [10, 15, 20, 25]) {
    const play = playTurn(right, down);
    const rig = windRig(model, 'trombone', { ...base, play });
    const [below, side] = slideAngles(rig.slideAxis, play);
    console.log(
      `  ${right}, ${down} | ${below.toFixed(1)}, ${side.toFixed(1)} | ${rig.slideReach.toFixed(3)}`,
    );
  }
}
