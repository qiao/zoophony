// Lists the faces of the red fox that fold most often in the play, with their places and bones.
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { foldedFaces, mainBone } from '../../../tools/fold-probe.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';

const step = Number(process.argv[2] ?? 1);
const freq = new Map<number, number>();
let samples = 0;
let rig: any = null;
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const index = scene.layout.players.findIndex((p) => p.cast.species === 'fox-red');
  if (index < 0) continue;
  const place = scene.layout.players[index]!.cast;
  const model = scene.models.get(place.species, place.instrument, place.kettles, place.support);
  rig = model.studio;
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const times: [number, number, any][] = [[start, 10, NOT_STARTED]];
  for (let s = start; s <= scene.score.durationSec; s += step) times.push([s, 10 + s - start, PLAYING]);
  for (const [song, wall, transport] of times) {
    const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index]!;
    const m = poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
    for (const f of foldedFaces(rig.mesh, m.matrices, skinStudioMesh(rig.mesh, m))) freq.set(f, (freq.get(f) ?? 0) + 1);
    samples++;
  }
}
console.log('samples', samples);
const top = [...freq].sort((a, b) => b[1] - a[1]).slice(0, 20);
for (const [f, n] of top) {
  const c = [0, 1, 2].map((k) => rig.mesh.corners[f * 3 + k]);
  const mid = [0, 1, 2].map((a) => c.reduce((s: number, v: number) => s + rig.mesh.positions[v * 3 + a], 0) / 3);
  const bones = c.map((v: number) => [0, 1, 2, 3].filter((k) => rig.mesh.weights[v * 4 + k] > 0).map((k) => `${STUDIO_BONES[rig.mesh.joints[v * 4 + k]]}:${rig.mesh.weights[v * 4 + k].toFixed(2)}`).join(' '));
  console.log(f, n, mainBone(rig.mesh, f), mid.map((x) => x.toFixed(3)).join(' '), '|', bones.join(' | '));
}
