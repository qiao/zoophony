// Prints the playing place of the contrabass of the hippo: the contact point, the nut, the end
// pin, the lean from the vertical, the side of the lean, and the turn of the top plate.
import { Quaternion, Vector3 } from 'three';
import { buildPlayer } from '../../../src/models/player.ts';
import { bowedRig, holdOf, playingFrames } from '../../../src/pose/bowed-rig.ts';
import { createBowPlaces, instrumentAt } from '../../../src/pose/bowed.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
const set = process.argv[2];
if (set) setHolds(set);
const model = buildPlayer('hippo', 'contrabass', 4, 'stand');
const rig = bowedRig(model, 'contrabass', holdOf('hippo', 'contrabass'));
const frames = playingFrames(rig);
const { place } = createBowPlaces();
instrumentAt(rig, frames, 1, place);
const posed = (p: readonly number[]): Vector3 => new Vector3(p[0], p[1], p[2]).sub(new Vector3(...rig.pivot)).applyQuaternion(place.rotation).add(place.pivot);
const contact = posed(rig.contact), nut = posed(rig.nut), pin = place.pivot.clone();
const axis = nut.clone().sub(pin).normalize();
const top = new Vector3(...rig.top).applyQuaternion(place.rotation);
const f = (v: Vector3): string => v.toArray().map((x) => x.toFixed(3)).join(', ');
console.log(`end pin ${f(pin)}, contact ${f(contact)}, nut ${f(nut)}`);
console.log(`lean from the vertical ${(Math.acos(axis.y) * 180 / Math.PI).toFixed(1)} deg, to the left ${(Math.atan2(-axis.x, axis.y) * 180 / Math.PI).toFixed(1)} deg, back ${(Math.atan2(axis.z, axis.y) * 180 / Math.PI).toFixed(1)} deg`);
console.log(`top plate normal ${f(top)}, turn to the right of forward ${(Math.atan2(top.x, -top.z) * 180 / Math.PI).toFixed(1)} deg`);
void Quaternion;
