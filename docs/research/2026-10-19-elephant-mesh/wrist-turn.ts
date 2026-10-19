/**
 * Finds the turn of a paw of the elephant timpanist of each demo from its forearm
 * (the world turn of the studio bone `hand_L` from the bind pose after the inverse of the world
 * turn of `forearm_L`, as `poseStudioBones()` gives them), in the play at each 1 s. It prints the
 * mean turn over the samples in which one of the named faces folds (`foldedFaces()` of
 * `pnpm fold-probe`), in the model axes and in the axes of the studio, and the share of the
 * samples with a fold in each bin of 10 degrees from that turn.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-19-elephant-mesh/wrist-turn.ts <face>[,<face>]... [--side L|R]
 *
 * The probe of the cat violist (`docs/research/2026-10-17-cat-bow/wrist-turn.ts`), with the role
 * of the timpanist, who stands.
 */
import { Matrix4, Quaternion } from 'three';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';
import { poseAt, createScenePose } from '../../../src/pose/pose-at.ts';
import { sceneOf, allAudible, PLAYING } from '../../../src/pose/test-scene.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { foldedFaces, roleBodies, FOLD_ROLES } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const args = process.argv.slice(2);
const faces = new Set((args[0] ?? '2116').split(',').map(Number));
const side = args.includes('--side') ? args[args.indexOf('--side') + 1] : 'L';
const foreName = args.includes('--fore') && args[args.indexOf('--fore') + 1] === 'twist' ? `forearm_twist_${side}` : `forearm_${side}`;
const role = FOLD_ROLES.get('timpanist')!;
const iFore = STUDIO_BONES.indexOf(foreName as never);
const iHand = STUDIO_BONES.indexOf(`hand_${side}` as never);
const samples: { q: Quaternion; folded: boolean }[] = [];
const m = new Matrix4();
for (const demo of (await patchedDemos()).slice(0, 14)) {
  const scene = sceneOf(demo.bytes);
  const bodies = roleBodies(role, scene);
  const body = bodies.find((b) => b.index !== null);
  if (!body || body.index === null) continue;
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  for (let song = Math.max(0, start); song < scene.score.durationSec; song += 1) {
    const pose = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer).players[body.index];
    if (!pose) continue;
    const rig = body.model.studio!;
    const studio = poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
    const posed = skinStudioMesh(rig.mesh, studio);
    const folded = foldedFaces(rig.mesh, studio.matrices, posed).some((f) => faces.has(f));
    const qf = new Quaternion().setFromRotationMatrix(m.fromArray(studio.matrices, iFore * 16));
    const qh = new Quaternion().setFromRotationMatrix(m.fromArray(studio.matrices, iHand * 16));
    samples.push({ q: qf.invert().multiply(qh), folded });
  }
}
const folded = samples.filter((s) => s.folded);
console.log('samples', samples.length, 'folded', folded.length);
// The mean of the folded turns: the normalized sum with signs aligned to the first.
const first = folded[0]!.q;
const mean = new Quaternion(0, 0, 0, 0);
for (const s of folded) {
  const sign = s.q.dot(first) < 0 ? -1 : 1;
  mean.x += sign * s.q.x; mean.y += sign * s.q.y; mean.z += sign * s.q.z; mean.w += sign * s.q.w;
}
mean.normalize();
const deg = (q: Quaternion): number => (2 * Math.acos(Math.min(1, Math.abs(q.dot(mean)))) * 180) / Math.PI;
console.log('mean turn (model axes)', mean.toArray().map((v) => v.toFixed(4)).join(', '), 'angle from bind', ((2 * Math.acos(Math.min(1, Math.abs(mean.w))) * 180) / Math.PI).toFixed(1));
console.log('studio axes (x, z flip)', [-mean.x, mean.y, -mean.z, mean.w].map((v) => v.toFixed(4)).join(', '));
for (let b = 0; b < 90; b += 10) {
  const bin = samples.filter((s) => deg(s.q) >= b && deg(s.q) < b + 10);
  if (bin.length) console.log(`${b}-${b + 10} deg: ${bin.length} samples, ${((100 * bin.filter((s) => s.folded).length) / bin.length).toFixed(0)}% folded`);
}
