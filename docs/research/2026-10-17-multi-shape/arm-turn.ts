/**
 * Finds the turn of a key bone of an arm of the first seated cat violist of each demo, as
 * `poseStudioBones()` gives it, in the play at each step. The key is the upper arm in the axes of
 * the chest (`upper`), the clavicle in the axes of the chest (`clavicle`), the forearm from the upper
 * arm (`elbow`), or the paw from the forearm (`wrist`). It prints the mean turn over the samples in which one of the named faces folds
 * (`foldedFaces()` of `pnpm fold-probe`), in the model axes and in the axes of the studio, and the
 * share of the samples with a fold in each bin of 10 degrees from that turn. With `--turn
 * x,y,z,w`, it uses that turn in the axes of the studio in place of the mean.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-multi-shape/arm-turn.ts <face>[,<face>]... \
 *       [--side L|R] [--key upper|clavicle|elbow|wrist] [--step <s>] [--turn x,y,z,w]
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
const option = (name: string, fallback: string): string =>
  args.includes(name) ? (args[args.indexOf(name) + 1] ?? fallback) : fallback;
const faces = new Set((args[0] ?? '235').split(',').map(Number));
const side = option('--side', 'R');
const key = option('--key', 'upper');
const step = Number(option('--step', '1'));
const given = args.includes('--turn') ? option('--turn', '').split(',').map(Number) : null;
const [frameName, boneName] =
  key === 'upper'
    ? ['chest', `upper_arm_${side}`]
    : key === 'clavicle'
      ? ['chest', `clavicle_${side}`]
    : key === 'elbow'
      ? [`upper_arm_${side}`, `forearm_${side}`]
      : [`forearm_${side}`, `hand_${side}`];
const role = FOLD_ROLES.get('violist');
if (!role) {
  throw new Error('No role violist.');
}
const iFrame = STUDIO_BONES.indexOf(frameName as never);
const iBone = STUDIO_BONES.indexOf(boneName as never);
const samples: { q: Quaternion; folded: boolean }[] = [];
const m = new Matrix4();
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const body = roleBodies(role, scene).find(
    (b) => b.index !== null && scene.layout.players[b.index]?.cast.support !== 'stand',
  );
  if (!body || body.index === null) {
    continue;
  }
  const rig = body.model.studio;
  if (!rig) {
    continue;
  }
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  for (let song = Math.max(0, start); song < scene.score.durationSec; song += step) {
    const pose = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer).players[body.index];
    if (!pose) {
      continue;
    }
    const studio = poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
    const posed = skinStudioMesh(rig.mesh, studio);
    const folded = foldedFaces(rig.mesh, studio.matrices, posed).some((f) => faces.has(f));
    const qf = new Quaternion().setFromRotationMatrix(m.fromArray(studio.matrices, iFrame * 16));
    const qb = new Quaternion().setFromRotationMatrix(m.fromArray(studio.matrices, iBone * 16));
    samples.push({ q: qf.invert().multiply(qb), folded });
  }
}
const folded = samples.filter((s) => s.folded);
console.log(`faces ${[...faces].join(',')}, side ${side}, key ${key} (${boneName} in the axes of ${frameName}), step ${step} s`);
console.log('samples', samples.length, 'folded', folded.length);
let mean = new Quaternion(0, 0, 0, 0);
if (given) {
  const [x = 0, y = 0, z = 0, w = 1] = given;
  mean = new Quaternion(-x, y, -z, w).normalize();
} else {
  const first = folded[0]?.q ?? new Quaternion();
  for (const s of folded) {
    const sign = s.q.dot(first) < 0 ? -1 : 1;
    mean.x += sign * s.q.x;
    mean.y += sign * s.q.y;
    mean.z += sign * s.q.z;
    mean.w += sign * s.q.w;
  }
  mean.normalize();
}
const deg = (q: Quaternion): number => (2 * Math.acos(Math.min(1, Math.abs(q.dot(mean)))) * 180) / Math.PI;
console.log(`${given ? 'given' : 'mean'} turn (model axes) ${mean.toArray().map((v) => v.toFixed(4)).join(', ')}, angle from bind ${((2 * Math.acos(Math.min(1, Math.abs(mean.w))) * 180) / Math.PI).toFixed(1)}`);
console.log(`studio axes (x, z flip) ${[-mean.x, mean.y, -mean.z, mean.w].map((v) => v.toFixed(4)).join(', ')}`);
for (let b = 0; b < 180; b += 10) {
  const bin = samples.filter((s) => deg(s.q) >= b && deg(s.q) < b + 10);
  if (bin.length) {
    console.log(`${b}-${b + 10} deg: ${bin.length} samples, ${bin.filter((s) => s.folded).length} folded (${((100 * bin.filter((s) => s.folded).length) / bin.length).toFixed(1)}%)`);
  }
}
