// Prints the length from the left wrist to the middle of the finger block of the hippo, the
// radius of the forearm skin near the wrist, and the half sizes of the neck of the contrabass.
import { Vector3 } from 'three';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
const model = buildPlayer('hippo', 'contrabass', 4, 'stand');
const rig = bowedRig(model, 'contrabass', holdOf('hippo', 'contrabass'));
const pos = model.skeleton.positions;
const wrist = new Vector3(...(pos[boneIndex('handL')] as [number, number, number]));
const elbow = new Vector3(...(pos[boneIndex('forearmL')] as [number, number, number]));
const block = new Vector3(...rig.fingerBlock).add(new Vector3(...rig.knuckles));
console.log(`wrist to finger block ${block.length().toFixed(3)} m, forearm ${wrist.distanceTo(elbow).toFixed(3)} m`);
const axis = wrist.clone().sub(elbow).normalize();
const fb = boneIndex('forearmL');
let n = 0, sum = 0, max = 0;
for (let i = 0; i < model.mesh.bones.length; i++) {
  if (model.mesh.bones[i] !== fb) continue;
  const p = new Vector3(model.mesh.positions[3 * i], model.mesh.positions[3 * i + 1], model.mesh.positions[3 * i + 2]);
  const t = p.clone().sub(elbow).dot(axis) / wrist.distanceTo(elbow);
  if (t < 0.8 || t > 1.05) continue;
  const r = p.clone().sub(elbow).sub(axis.clone().multiplyScalar(t * wrist.distanceTo(elbow))).length();
  n++; sum += r; max = Math.max(max, r);
}
console.log(`forearm skin radius near the wrist (0.8 to 1.05): mean ${(sum / n).toFixed(3)} m, max ${max.toFixed(3)} m, ${n} corners`);
