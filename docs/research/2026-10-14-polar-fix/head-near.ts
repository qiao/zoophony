// Finds the nearest points of the head and of the closed case of the piano in the play samples of
// one demo: the gap, the song time, the head point, and the case point (meters, the model axes).
// Usage: node scratch/head-near.ts [demo] [step] [<changes>]
import { Triangle, Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { HEAD_PART } from '../../../src/pose/test-sweep.ts';
import { PIANIST_SWEEP, pianoCase, playSample } from '../../../src/pose/test-sweep-roles.ts';

const [id = 'boulanger-matin', stepText = '0.5', changes = ''] = process.argv.slice(2);
const change = changes ? setHolds(changes) : null;
const demo = (await patchedDemos()).find((d) => d.file === `${id}.mid`);
if (!demo) {
  throw new Error(id);
}
const scene = sceneOf(demo.bytes);
const player = PIANIST_SWEEP.players(scene)[0];
if (!player) {
  throw new Error('no pianist');
}
const { mesh } = player.model;
const headBones = new Set<string>(HEAD_PART.bones);
const headCorners: number[] = [];
for (let c = 0; c < mesh.bones.length; c++) {
  if (headBones.has(BONE_NAMES[mesh.bones[c] ?? 0] ?? '')) {
    headCorners.push(c);
  }
}
const step = Number(stepText);
let best = { gap: Infinity, song: 0, head: new Vector3(), at: new Vector3(), bone: '' };
const point = new Vector3();
const near = new Vector3();
for (let song = 0; song <= scene.score.durationSec; song += step) {
  const posed = poseSkeleton(player.model, player.poseAt(playSample(scene, song)));
  const triangles = pianoCase(posed).surface.triangles;
  for (const c of headCorners) {
    point.fromArray(posedCorner(posed, c));
    if (point.y < 0.9) {
      continue;
    }
    for (const t of triangles) {
      (t as Triangle).closestPointToPoint(point, near);
      const d = near.distanceTo(point);
      if (d < best.gap) {
        best = { gap: d, song, head: point.clone(), at: near.clone(), bone: BONE_NAMES[mesh.bones[c] ?? 0] ?? '' };
      }
    }
  }
}
change?.undo();
const f = (v: Vector3) => v.toArray().map((x) => x.toFixed(3)).join(', ');
console.log(
  `${id} ${changes || 'base'}: gap ${(best.gap * 100).toFixed(1)} cm at song ${best.song.toFixed(2)} s, head (${best.bone}) ${f(best.head)}, case ${f(best.at)}`,
);
