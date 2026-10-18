// Prints the right arm of the first seated dog cellist of a demo at song times:
// node docs/research/2026-10-17-dog-arms/arm-at.ts <demo> <changes|-> <t>...
import { Matrix4, Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets } from '../../../src/models/studio-rig.ts';
import { poseAt, createScenePose } from '../../../src/pose/pose-at.ts';
import { sceneOf, allAudible, PLAYING } from '../../../src/pose/test-scene.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { roleBodies, FOLD_ROLES } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const [want, changes, ...times] = process.argv.slice(2);
if (changes && changes !== '-') setHolds(changes);
const role = FOLD_ROLES.get('cellist');
if (!role) throw new Error('no role');
const idx = (n: string) => STUDIO_BONES.indexOf(n as never);
for (const demo of await patchedDemos()) {
  if (!demo.file.startsWith(want ?? '')) continue;
  const scene = sceneOf(demo.bytes);
  const body = roleBodies(role, scene).find((b) => b.index !== null);
  const rig = body?.model.studio;
  if (!body || body.index === null || !rig) continue;
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const joint = (m: Float32Array, n: string) => new Vector3(...rig.body.heads[n as keyof typeof rig.body.heads] ?? [0, 0, 0]).applyMatrix4(new Matrix4().fromArray(m, idx(n) * 16));
  for (const t of times.map(Number)) {
    const pose = poseAt(scene.plan, t, 10 + t - start, PLAYING, audible, buffer).players[body.index];
    if (!pose) continue;
    const s = poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
    const sh = joint(s.matrices, 'upper_arm_R'), el = joint(s.matrices, 'forearm_R'), wr = joint(s.matrices, 'hand_R');
    const len = sh.distanceTo(el) + el.distanceTo(wr);
    const f = (v: Vector3) => v.toArray().map((x) => x.toFixed(3)).join(',');
    const ang = 180 - (el.clone().sub(sh).angleTo(wr.clone().sub(el)) * 180) / Math.PI;
    console.log(`${demo.file} ${t}: shoulder ${f(sh)} elbow ${f(el)} wrist ${f(wr)}; reach ${(sh.distanceTo(wr) / len).toFixed(3)} of the arm, elbow angle ${ang.toFixed(0)} deg`);
  }
}
