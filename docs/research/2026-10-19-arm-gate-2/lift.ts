// Prints the signed paw twist of the bear conductor at the start of the lift, in steps of 0.01 s.
import { Matrix4, Quaternion, Vector3 } from 'three';
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets, twistAngle } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
const turnOf = (m: ArrayLike<number>, b: number) =>
  new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(Array.from({ length: 16 }, (_, k) => m[b * 16 + k] ?? 0)));
const demo = (await patchedDemos()).find((d) => d.file === (process.env['DEMO'] ?? 'beethoven-1.mid'))!;
const scene = sceneOf(demo.bytes);
const [body] = roleBodies(FOLD_ROLES.get('conductor')!, scene);
const rig = body!.model.studio!;
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const lift = { ...PLAYING, changedAtWall: 10 };
const buffer = createScenePose(scene.plan);
for (let wall = 10; wall <= 10.4001; wall += 0.01) {
  const song = Math.min(0, start + wall - 10);
  const pose = poseAt(scene.plan, song, wall, lift, allAudible(scene.score), buffer).conductor!;
  const studio = poseStudioBones(rig, body!.model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
  const out = (['L', 'R'] as const).map((side) => {
    const h = rig.body.heads;
    const axis = new Vector3(...h[`hand_${side}`]).sub(new Vector3(...h[`forearm_${side}`])).normalize();
    const q = turnOf(studio.matrices, STUDIO_BONES.indexOf(`forearm_${side}`)).invert().multiply(turnOf(studio.matrices, STUDIO_BONES.indexOf(`hand_${side}`)));
    return `${side} ${((twistAngle(q, axis) * 180) / Math.PI).toFixed(0)}`;
  });
  console.log(`wall ${(wall - 10).toFixed(2)} s: ${out.join(', ')}`);
}
