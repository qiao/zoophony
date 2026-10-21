// Prints the nearest distance of the harp and of the lowest paw point to the box of the stool of
// the deer, over the play samples of the harpist sweep.
import { Box3, Vector3 } from 'three';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import { HARPIST_SWEEP, playSample } from '../../../../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../../src/pose/test-skin.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
const demo = (await probeDemos()).find((d) => d.file.startsWith('boulanger'))!;
const scene = sceneOf(demo.bytes);
const player = HARPIST_SWEEP.players(scene)[0]!;
const m = player.model;
const seat = m.seat!;
const w = (seat.seatWidth ?? 0.36) / 2;
const box = new Box3(new Vector3(-w, 0, -0.18), new Vector3(w, seat.seatHeight, 0.18));
console.log('stool box', box.min.toArray(), box.max.toArray());
const inst = boneIndex('instrument');
let harp = Infinity;
for (let c = 0; c < m.mesh.bones.length; c++) {
  if (m.mesh.bones[c] !== inst) continue;
  harp = Math.min(harp, box.distanceToPoint(new Vector3(m.mesh.positions[c * 3], m.mesh.positions[c * 3 + 1], m.mesh.positions[c * 3 + 2])));
}
console.log('harp to stool', (harp * 100).toFixed(1), 'cm');
const arm = new Set(['handL', 'handR', 'fingersL', 'fingersR', 'forearmL', 'forearmR'].map((b) => boneIndex(b as never)));
const corners: number[] = [];
for (let c = 0; c < m.mesh.bones.length; c++) if (arm.has(m.mesh.bones[c] ?? -1)) corners.push(c);
let best = Infinity;
for (const set of HARPIST_SWEEP.sampleSets(scene)) {
  let k = 0;
  for (const s of set.samples) {
    if (k++ % 4) continue;
    const posed = poseSkeleton(m, player.poseAt(s));
    for (const c of corners) best = Math.min(best, box.distanceToPoint(new Vector3(...posedCorner(posed, c))));
  }
  console.log(set.name, 'arms to stool', (best * 100).toFixed(1), 'cm');
}
