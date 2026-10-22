// Prints the frame of the contrabass of the hippo in the bind: the contact point, the nut, the
// top normal, the end pin, and the extent of the corners along the axis, the top, and across.
import { Vector3 } from 'three';
import { SPECIES } from '../../../src/models/species.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
const sc = Number(process.argv[2] ?? '0');
if (sc > 0) (SPECIES.hippo as { bassScale?: number }).bassScale = sc;
const model = buildPlayer('hippo', 'contrabass', 4, 'stand');
const rig = bowedRig(model, 'contrabass', holdOf('hippo', 'contrabass'));
const c = new Vector3(...rig.contact), top = new Vector3(...rig.top), axis = new Vector3(...rig.axis);
const across = new Vector3().crossVectors(top, axis);
const inst = boneIndex('instrument');
const rows: [number, number, number][] = [];
for (let i = 0; i < model.mesh.bones.length; i++) {
  if (model.mesh.bones[i] !== inst) continue;
  const p = new Vector3(model.mesh.positions[3 * i], model.mesh.positions[3 * i + 1], model.mesh.positions[3 * i + 2]).sub(c);
  rows.push([p.dot(axis), p.dot(top), p.dot(across)]);
}
const pv = new Vector3(...rig.pivot).sub(c);
console.log('pivot along axis', pv.dot(axis).toFixed(3), 'top', pv.dot(top).toFixed(3), 'across', pv.dot(across).toFixed(3));
console.log('nut along axis', new Vector3(...rig.nut).sub(c).dot(axis).toFixed(3), 'top', new Vector3(...rig.nut).sub(c).dot(top).toFixed(3));
for (let a = -0.6; a < 1.2; a += 0.1) {
  const sel = rows.filter((r) => r[0] >= a && r[0] < a + 0.1);
  if (!sel.length) continue;
  const t = sel.map((r) => r[1]), x = sel.map((r) => r[2]);
  console.log(`axis ${a.toFixed(1)}..${(a + 0.1).toFixed(1)}: top ${Math.min(...t).toFixed(3)}..${Math.max(...t).toFixed(3)} across ${Math.min(...x).toFixed(3)}..${Math.max(...x).toFixed(3)}`);
}
