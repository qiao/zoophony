// Prints the height of the lowest corner of each mallet of the timpanist and of each paw joint,
// in meters above the floor, over a window of the play of one demo, at steps of 0.05 s, to show
// the lift and the fall of the strokes. Usage, from the root of the tree:
// node docs/research/2026-10-25-elephant-arms/mallet-heights.ts <demo file> <from s> <to s>
import { Vector3 } from 'three';

import { patchedDemos } from '../../../tools/patch-demos.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { poseSkeleton, posedPoint } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { SWEEP_ROLES, playSample } from '../../../src/pose/test-sweep-roles.ts';

const file = process.argv[2] ?? 'beethoven-1.mid';
const from = Number(process.argv[3] ?? '140');
const to = Number(process.argv[4] ?? '143');
const role = SWEEP_ROLES.timpanist;
const demo = (await patchedDemos()).find((d) => d.file === file);
if (!demo) {
  throw new Error(`no ${file}`);
}
const scene = sceneOf(demo.bytes);
const [player] = role.players(scene);
if (!player) {
  throw new Error('no timpanist');
}
const { positions, bones } = player.model.mesh;
const lowest = (posed: ReturnType<typeof poseSkeleton>, bone: number): number => {
  let low = Infinity;
  for (let c = 0; c < bones.length; c++) {
    if (bones[c] === bone) {
      low = Math.min(low, posedCorner(posed, c)[1]);
    }
  }
  return low;
};
const joint = (posed: ReturnType<typeof poseSkeleton>, name: 'handL' | 'handR'): number => {
  const bind = player.model.skeleton.positions[boneIndex(name)] ?? [0, 0, 0];
  return new Vector3(...posedPoint(posed, name, bind)).y;
};
console.log(`Heights of the timpanist in ${file}, in meters above the floor.`);
console.log('| Song s | Left mallet | Right mallet | Left paw | Right paw |');
console.log('|---:|---:|---:|---:|---:|');
for (let song = from; song <= to + 1e-9; song += 0.05) {
  const posed = poseSkeleton(player.model, player.poseAt(playSample(scene, song)));
  const cells = [
    lowest(posed, boneIndex('malletL')),
    lowest(posed, boneIndex('malletR')),
    joint(posed, 'handL'),
    joint(posed, 'handR'),
  ];
  console.log(`| ${song.toFixed(2)} | ${cells.map((v) => v.toFixed(3)).join(' | ')} |`);
}
