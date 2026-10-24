/**
 * Traces one move of the arm gate (`probeMoves()` of `tools/arm-check.ts`): for each arm, the paw
 * twist on the forearm, the turn rate of the gate (the larger of r1, the twist bone on the forearm,
 * and r2, the paw on the twist bone, in degrees per second), and the paw swing, at each step.
 *
 * Usage: node docs/research/2026-10-24-violin-poses/move-trace.ts <role> <demo> <lift|lower> <at> [--set <changes>] [--step <s>]
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  studioOffsets,
  twistAngle,
} from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import type { Transport } from '../../../src/pose/types.ts';
import { LIFT_FIT_SEC, LOWER_MAX_SEC } from '../../../src/pose/rest.ts';
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';

const args = process.argv.slice(2);
const [role = 'violinist', demoName = 'beethoven-8', kind = 'lift', atText = '0'] = args;
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const changes = pick('--set');
if (changes.length > 0) {
  setHolds(changes.join(';'));
}
const step = Number(pick('--step')[0] ?? 0.02);
const at = Number(atText);
const demo = (await probeDemos()).find((d) => d.file === `${demoName.replace(/\.mid$/, '')}.mid`);
if (!demo) {
  throw new Error(`no demo ${demoName}`);
}
const scene = sceneOf(demo.bytes);
const source = FOLD_ROLES.get(role);
if (!source) {
  throw new Error(`no role ${role}`);
}
const [body] = roleBodies(source, scene);
const rig = body?.model.studio;
if (!body || !rig || body.index === null) {
  throw new Error('no body');
}
const audible = allAudible(scene.score);
const buffer = createScenePose(scene.plan);
const lead = countInAt(scene.plan.beats, at).lengthSec;
const transport: Transport =
  kind === 'lift'
    ? { ...PLAYING, changedAtWall: 10, startSec: at }
    : { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
const span = kind === 'lift' ? LIFT_FIT_SEC : transport.holdSec + LOWER_MAX_SEC;
const from = kind === 'lift' ? 0 : transport.holdSec;
const studio = createStudioPose();
const turnOf = (bone: number): Quaternion =>
  new Quaternion().setFromRotationMatrix(
    new Matrix4().fromArray(Array.from({ length: 16 }, (...[, k]) => studio.matrices[bone * 16 + k] ?? 0)),
  );
const h = rig.body.heads;
const deg = (r: number): number => (r * 180) / Math.PI;
const last: Record<string, Quaternion[]> = {};
console.log(' wall | L: twist rate swing r1 r2 | R: twist rate swing r1 r2');
for (let wall = from; wall <= span + 1e-9; wall += step) {
  const song = kind === 'lift' ? Math.min(at, at - lead + wall) : at;
  const frame = poseAt(scene.plan, song, 10 + wall, transport, audible, buffer);
  const pose = frame.players[body.index];
  if (!pose) {
    continue;
  }
  poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
  const cells: string[] = [];
  for (const side of ['L', 'R'] as const) {
    const fore = turnOf(STUDIO_BONES.indexOf(`forearm_${side}`));
    const twistBone = turnOf(STUDIO_BONES.indexOf(`forearm_twist_${side}`));
    const hand = turnOf(STUDIO_BONES.indexOf(`hand_${side}`));
    const foreBind = new Vector3(...h[`hand_${side}`]).sub(new Vector3(...h[`forearm_${side}`])).normalize();
    const paw = fore.clone().invert().multiply(hand);
    const turns = [fore.clone().invert().multiply(twistBone), twistBone.clone().invert().multiply(hand)];
    const before = last[side];
    last[side] = turns;
    const rate = before
      ? Math.max(
          ...turns.map(
            (t, j) => (2 * Math.acos(Math.min(1, Math.abs(t.dot(before[j] ?? t)))) * 180) / Math.PI,
          ),
        ) / step
      : 0;
    const tw = twistAngle(paw, foreBind);
    const twistQ = new Quaternion().setFromAxisAngle(foreBind, tw);
    const swingQ = paw.clone().multiply(twistQ.invert());
    const swing = deg(2 * Math.acos(Math.min(1, Math.abs(swingQ.w))));
    const r1 = before ? (2 * Math.acos(Math.min(1, Math.abs(turns[0]!.dot(before[0]!)))) * 180) / Math.PI / step : 0;
    const r2 = before ? (2 * Math.acos(Math.min(1, Math.abs(turns[1]!.dot(before[1]!)))) * 180) / Math.PI / step : 0;
    cells.push(`${deg(tw).toFixed(0).padStart(6)} ${rate.toFixed(0).padStart(6)} sw${swing.toFixed(0).padStart(4)} r1 ${r1.toFixed(0).padStart(5)} r2 ${r2.toFixed(0).padStart(5)}`);
  }
  console.log(`${(wall - from).toFixed(2).padStart(5)} ${cells.join(' ')}`);
}
