// Probe: folds of the red fox play samples with the corrective weight of the right arm changed.
// Usage: node docs/research/2026-10-15-fox-rig2/arm-down-weight.ts <step>
import { FOLD_ROLES, foldedFaces, roleBodies } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';

const step = Number(process.argv[2] ?? '1');
const role = FOLD_ROLES.get(process.argv[3] ?? 'fox-violinist');
if (!role) throw new Error('role');
const variants: [string, (w: number) => number][] = [
  ['as is', (w) => w],
  ['0', () => 0],
  ['1', () => 1],
  ['0.5x', (w) => w * 0.5],
  ['1.5x', (w) => w * 1.5],
];
const counts = variants.map(() => ({ n: 0, any: 0, f389: 0, f390: 0 }));
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const bodies = roleBodies(role, scene);
  if (bodies.length === 0) continue;
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  for (let song = start; song <= scene.score.durationSec; song += step) {
    const frame = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer);
    for (const { index, model } of bodies) {
      const rig = model.studio;
      const pose = index === null ? frame.conductor : frame.players[index];
      if (!rig || !pose) continue;
      const studio = poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
      const w0 = studio.correctives[1] ?? 0;
      for (const [k, [, fn]] of variants.entries()) {
        studio.correctives[1] = fn(w0);
        const folded = foldedFaces(rig.mesh, studio.matrices, skinStudioMesh(rig.mesh, studio));
        const c = counts[k]!;
        c.n++;
        if (folded.length) c.any++;
        if (folded.includes(389)) c.f389++;
        if (folded.includes(390)) c.f390++;
      }
    }
  }
}
for (const [k, [name]] of variants.entries()) {
  const c = counts[k]!;
  console.log(`${name}: n ${c.n} any ${(100 * c.any / c.n).toFixed(1)}% 389 ${(100 * c.f389 / c.n).toFixed(1)}% 390 ${(100 * c.f390 / c.n).toFixed(1)}%`);
}
