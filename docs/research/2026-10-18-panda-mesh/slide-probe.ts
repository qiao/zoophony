/**
 * Measures the trombone slide of the parametric panda of the app: the arm, the posed right
 * shoulder joint, the grip at the first position, the slide axis, and the reach that each slide
 * travel needs (as `slideReachOf()` of `src/pose/winds.ts`).
 * Usage: node docs/research/2026-10-18-panda-mesh/slide-probe.ts
 */
import { Quaternion, Vector3 } from 'three';

import { buildPlayer } from '../../../src/models/player.ts';
import { ARM_REACH, poseShoulder } from '../../../src/pose/ik.ts';
import { WIND_HOLDS, windRig } from '../../../src/pose/winds.ts';

const model = buildPlayer('panda', 'trombone');
const rig = windRig(model, 'trombone');
const arm = rig.right.arm;
const s = new Vector3(...arm.bind.shoulder);
const e = new Vector3(...arm.bind.elbow);
const w = new Vector3(...arm.bind.wrist);
const palm = new Vector3(...arm.palm);
const upper = s.distanceTo(e);
const fore = e.distanceTo(w);
const full = upper + fore + palm.length();
const ik = arm.reach + palm.length();
const chest = { rotation: new Quaternion(), position: new Vector3(...rig.chestBind) };
const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), WIND_HOLDS.trombone.reach);
const joint = poseShoulder(arm, chest, rig.chestBind, turn).position;
const grip = new Vector3(...rig.right.grip);
const axis = new Vector3(...rig.slideAxis);
const f = (v: Vector3): string => `(${v.toArray().map((x) => x.toFixed(4)).join(', ')})`;
console.log(`H ${model.body.headHeight.toFixed(4)} m, seat ${model.seat?.seatHeight.toFixed(3)} m`);
console.log(
  `right arm: upper ${upper.toFixed(4)} m, fore ${fore.toFixed(4)} m, wrist to palm ${palm.length().toFixed(4)} m, ` +
    `the full reach to the middle of the palm ${full.toFixed(4)} m, the reach of the IK (0.97 of the bones plus the palm) ${ik.toFixed(4)} m (ARM_REACH ${ARM_REACH})`,
);
console.log(
  `bind shoulder joint ${f(s)}, posed ${f(joint)}, grip ${f(grip)}, slide axis ${f(axis)}, slide reach ${rig.slideReach.toFixed(3)} m`,
);
for (const travel of [0, rig.slideReach, 0.275, 0.55]) {
  const need = grip.clone().addScaledVector(axis, travel).distanceTo(joint);
  console.log(
    `travel ${travel.toFixed(3)} m: the IK reach ${need.toFixed(4)} m, ${(need / ik).toFixed(4)} of the reach of the panda, ` +
      `${(need - ik).toFixed(4)} m more`,
  );
}
