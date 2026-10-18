/**
 * Measures the slide reach of the panda (`slideReach` of `windRig()`, `slideReachOf()` of
 * `src/pose/winds.ts`) for variants of its trombone hold: the forward turn of the right shoulder
 * (`reach`), the turn of the slide to the right of the player around the vertical, and the turn of
 * the slide down, both around the mouthpiece (`play`), and the turn of the head to the right
 * (`headTurn`). It prints the mouthpiece and the grip of the first position in the playing pose.
 * Usage: node docs/research/2026-10-18-panda-mesh/slide-hold.ts
 */
import { MathUtils, Quaternion, Vector3 } from 'three';

import { buildPlayer } from '../../../src/models/player.ts';
import { toQuat } from '../../../src/models/tuples.ts';
import { windGrips, windHoldOf, windRig } from '../../../src/pose/winds.ts';

const model = buildPlayer('panda', 'trombone');
const base = windHoldOf('panda', 'trombone');
const f = (v: readonly number[]): string => `(${v.map((x) => x.toFixed(3)).join(', ')})`;
const rad = MathUtils.DEG2RAD;
console.log(`H ${model.body.headHeight.toFixed(4)} m, the hold of main: reach 45 deg, no turn.`);
for (const head of [0, -15]) {
  for (const right of [0, 10, 20, 30]) {
    for (const down of [0, 15]) {
      for (const reach of [45, 60, 75]) {
        // A turn around y moves the slide to the left of the player, so the right is negative.
        const play = toQuat(
          new Quaternion()
            .setFromAxisAngle(new Vector3(0, 1, 0), -right * rad)
            .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -down * rad)),
        );
        const hold = { ...base, play, reach: reach * rad, headTurn: head * rad };
        const rig = windRig(model, 'trombone', hold);
        const grips = windGrips(rig, 1);
        const need = new Vector3(...grips.R.grip).distanceTo(new Vector3(...grips.R.joint));
        console.log(
          `head ${head}, slide right ${right}, down ${down}, shoulder ${reach} deg: slide reach ${rig.slideReach.toFixed(3)} m, ` +
            `first position grip ${f(grips.R.grip)} ${need.toFixed(3)} m from the shoulder joint`,
        );
      }
    }
  }
}
