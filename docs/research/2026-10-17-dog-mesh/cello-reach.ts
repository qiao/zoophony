/**
 * Measures the reach of the arms of the dog against the cello of the app in the playing pose of
 * its hold, with no idle motion: the distance from the left shoulder joint to the wrist of the
 * stopping hand at the nut and at the end of the fingerboard, and from the right shoulder joint to
 * the wrist of the bow hand at the frog and at the tip of the hair, on the lowest and the highest
 * strings, against the reach of each arm (0.97 of the arm from the shoulder joint to the wrist).
 * It also gives the reached parts (`stopRange`, `bowRange`) and the arm factor that reaches the
 * whole fingerboard and the whole hair. Usage: node docs/research/2026-10-17-dog-mesh/cello-reach.ts [<hold changes>]...
 */
import { Quaternion, Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';

import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { bowRangeOf, bowedRig, holdOf, playingFrames, stopRangeOf } from '../../../src/pose/bowed-rig.ts';
import { poseShoulder } from '../../../src/pose/ik.ts';
import { createBowPlaces, gripHand, heldBowAt, instrumentAt, shoulderTurn, stringsAt } from '../../../src/pose/bowed.ts';

const sets = process.argv.slice(2);
const undo = sets.length > 0 ? setHolds(sets.join(';')) : null;
void undo;
const model = buildPlayer('dog', 'cello', 4, 'chair');
const rig = bowedRig(model, 'cello', holdOf('dog', 'cello'));
const arm = (side: 'L' | 'R'): number => {
  const j = (b: 'upperArm' | 'forearm' | 'hand'): Vector3 =>
    new Vector3(...(model.skeleton.positions[boneIndex(`${b}${side}`)] ?? [0, 0, 0]));
  return j('upperArm').distanceTo(j('forearm')) + j('forearm').distanceTo(j('hand'));
};
const frames = playingFrames(rig);
const { place } = createBowPlaces();
instrumentAt(rig, frames, 1, place);
const posed = (p: readonly number[]): Vector3 =>
  new Vector3(p[0], p[1], p[2])
    .sub(new Vector3(...rig.pivot))
    .applyQuaternion(place.rotation)
    .add(place.pivot);
const shoulderL = poseShoulder(rig.armL, frames.chest, rig.chestBind, new Quaternion()).position;
const nut = posed(rig.nut);
const end = posed([rig.nut[0] + rig.neck[0], rig.nut[1] + rig.neck[1], rig.nut[2] + rig.neck[2]]);
const contact = posed(rig.contact);
console.log(
  `seat ${model.seat?.seatHeight.toFixed(3)} m, H ${model.body.headHeight.toFixed(3)} m, arm L ${arm('L').toFixed(4)} m (reach ${rig.armL.reach.toFixed(4)}), arm R ${arm('R').toFixed(4)} m (reach ${rig.armR.reach.toFixed(4)}), hair ${rig.hairLength.toFixed(3)} m`,
);
console.log(
  `left shoulder joint ${shoulderL.toArray().map((x) => x.toFixed(3))}: to the nut ${shoulderL.distanceTo(nut).toFixed(4)} m, to the end of the fingerboard ${shoulderL.distanceTo(end).toFixed(4)} m, to the contact point ${shoulderL.distanceTo(contact).toFixed(4)} m`,
);
const shoulderR = poseShoulder(rig.armR, frames.chest, rig.chestBind, shoulderTurn(rig, 1, new Quaternion())).position;
const places = createBowPlaces();
stringsAt(rig, place, places.strings);
const tilted = { grip: new Vector3(), rotation: new Quaternion() };
const wristAt = (string: number, at: number): Vector3 => {
  heldBowAt(rig, places.strings, string, at, 0, tilted, places.bow);
  return gripHand(rig, places.bow, 0, places.hand).wrist.clone();
};
const freeHair = rig.hold.freeHair;
for (const [name, at] of [['frog', freeHair], ['tip', rig.hairLength - freeHair]] as const) {
  const d = [0, 3].map((s) => wristAt(s, at).distanceTo(shoulderR));
  console.log(`right shoulder joint to the wrist with the contact point at the ${name} (${at.toFixed(3)} m of the hair): C string ${d[0]?.toFixed(4)} m, A string ${d[1]?.toFixed(4)} m`);
}
console.log(`right shoulder joint to the contact point ${shoulderR.distanceTo(contact).toFixed(4)} m`);
console.log(`stopRange ${rig.stopRange.map((x) => x.toFixed(2))}, bowRange ${rig.bowRange.map((x) => x.toFixed(3))} of ${rig.hairLength.toFixed(3)} m`);
// The arm factor that reaches the whole fingerboard and the whole hair of the hold.
const scaled = (f: number) => ({
  ...rig,
  armL: { ...rig.armL, reach: rig.armL.reach * f },
  armR: { ...rig.armR, reach: rig.armR.reach * f },
});
const free = rig.hold.freeHair;
const full = (f: number): [boolean, boolean] => {
  const s = stopRangeOf(scaled(f));
  const b = bowRangeOf(scaled(f));
  return [s[0] <= 1e-9 && s[1] >= 1 - 1e-9, b[0] <= free + 1e-6 && b[1] >= rig.hairLength - free - 0.011];
};
for (const which of [0, 1] as const) {
  let lo = 0.3;
  let hi = 4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (full(mid)[which]) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  console.log(`${which === 0 ? 'fingerboard (left arm)' : 'bow hair (right arm)'}: the reach factor ${hi.toFixed(4)}`);
}
