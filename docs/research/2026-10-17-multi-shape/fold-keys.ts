/**
 * Splits the play samples of the first seated cat violist of each demo by two keys of an arm, as
 * `poseStudioBones()` gives them: the turn of the upper arm in the axes of the chest, and the turn
 * of the forearm from the upper arm. For each key, it takes the mean turn of the samples in which
 * one of the named faces folds (`foldedFaces()` of `pnpm fold-probe`). It prints the share of the
 * samples with a fold in each cell of 5 degrees of the angle of each key from its mean, and the
 * mean weight of the arm-down shape of the side in the folded and in the other samples.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-multi-shape/fold-keys.ts <face>[,<face>]... [--side L|R] \
 *       [--step <s>]
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
const faces = new Set((args[0] ?? '1292').split(',').map(Number));
const side = option('--side', 'L');
const step = Number(option('--step', '1'));
const role = FOLD_ROLES.get('violist');
if (!role) {
  throw new Error('No role violist.');
}
const index = (name: string): number => STUDIO_BONES.indexOf(name as never);
const chest = index('chest');
const upper = index(`upper_arm_${side}`);
const fore = index(`forearm_${side}`);
const m = new Matrix4();
const turnOf = (matrices: Float32Array, b: number): Quaternion =>
  new Quaternion().setFromRotationMatrix(m.fromArray(matrices, b * 16));
const samples: { a: Quaternion; e: Quaternion; down: number; folded: boolean }[] = [];
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const body = roleBodies(role, scene).find(
    (b) => b.index !== null && scene.layout.players[b.index]?.cast.support !== 'stand',
  );
  const rig = body?.model.studio;
  if (!body || body.index === null || !rig) {
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
    const a = turnOf(studio.matrices, chest).invert().multiply(turnOf(studio.matrices, upper));
    const e = turnOf(studio.matrices, upper).invert().multiply(turnOf(studio.matrices, fore));
    samples.push({ a, e, down: studio.correctives[side === 'L' ? 0 : 1] ?? 0, folded });
  }
}
const mean = (pick: (s: (typeof samples)[number]) => Quaternion): Quaternion => {
  const folded = samples.filter((s) => s.folded);
  const first = folded[0] ? pick(folded[0]) : new Quaternion();
  const out = new Quaternion(0, 0, 0, 0);
  for (const s of folded) {
    const q = pick(s);
    const sign = q.dot(first) < 0 ? -1 : 1;
    out.set(out.x + sign * q.x, out.y + sign * q.y, out.z + sign * q.z, out.w + sign * q.w);
  }
  return out.normalize();
};
const ma = mean((s) => s.a);
const me = mean((s) => s.e);
const deg = (q: Quaternion, r: Quaternion): number => (2 * Math.acos(Math.min(1, Math.abs(q.dot(r)))) * 180) / Math.PI;
const studio = (q: Quaternion): string => [-q.x, q.y, -q.z, q.w].map((v) => v.toFixed(4)).join(', ');
const folded = samples.filter((s) => s.folded);
console.log(`faces ${[...faces].join(',')}, side ${side}, step ${step} s: ${samples.length} samples, ${folded.length} with a fold`);
console.log(`mean upper arm turn in the chest (studio axes) ${studio(ma)}, ${deg(ma, new Quaternion()).toFixed(1)} deg from the bind`);
console.log(`mean forearm turn from the upper arm (studio axes) ${studio(me)}, ${deg(me, new Quaternion()).toFixed(1)} deg from the bind`);
const avg = (list: typeof samples): number => list.reduce((t, s) => t + s.down, 0) / Math.max(1, list.length);
console.log(`mean arm-down weight: folded ${avg(folded).toFixed(3)}, other ${avg(samples.filter((s) => !s.folded)).toFixed(3)}`);
console.log('rows: upper arm angle from its mean; columns: forearm angle from its mean; cell: samples with a fold / samples');
const width = 5;
const rows = new Map<number, Map<number, [number, number]>>();
for (const s of samples) {
  const r = Math.min(Math.floor(deg(s.a, ma) / width), 8);
  const c = Math.min(Math.floor(deg(s.e, me) / width), 6);
  const row = rows.get(r) ?? new Map<number, [number, number]>();
  const cell = row.get(c) ?? [0, 0];
  row.set(c, [cell[0] + (s.folded ? 1 : 0), cell[1] + 1]);
  rows.set(r, row);
}
console.log(['upper \\ fore', ...Array.from({ length: 7 }, (...[, c]) => `${c * width}-${c === 6 ? '' : (c + 1) * width}`)].join('\t'));
for (const r of [...rows.keys()].toSorted((x, y) => x - y)) {
  const row = rows.get(r);
  const cells = Array.from({ length: 7 }, (...[, c]) => {
    const cell = row?.get(c);
    return cell ? `${cell[0]}/${cell[1]}` : '-';
  });
  console.log([`${r * width}-${r === 8 ? '' : (r + 1) * width}`, ...cells].join('\t'));
}
