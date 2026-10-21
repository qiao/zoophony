// Audit probe: samples each lift and each lowering of each role at 0.01 s, and prints the paw
// twist, the share of the twist bone, the wrist twist, the paw swing, and the turn rates.
// Usage: node scratch/moves.ts [role...] [--pauses <n>] [--json <file>]
import { writeFile } from 'node:fs/promises';

import { Matrix4, Quaternion, Vector3 } from 'three';

import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  studioOffsets,
  twistAngle,
} from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { LIFT_FIT_SEC, LOWER_MAX_SEC } from '../../../src/pose/rest.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import type { Transport } from '../../../src/pose/types.ts';

const args = process.argv.slice(2);
const pausesAt = args.indexOf('--pauses');
const pauses = pausesAt >= 0 ? Number(args[pausesAt + 1]) : 4;
const jsonAt = args.indexOf('--json');
const jsonFile = jsonAt >= 0 ? args[jsonAt + 1] : null;
const roles = args.filter((a, k) => !a.startsWith('--') && args[k - 1] !== '--pauses' && args[k - 1] !== '--json');
const chosen = roles.length > 0 ? roles : [...FOLD_ROLES.keys()];
const STEP = 0.01;
const DEG = 180 / Math.PI;

function turnOf(m: Float32Array, bone: number): Quaternion {
  return new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(m, bone * 16));
}
function wrap(d: number): number {
  return ((((d + 180) % 360) + 360) % 360) - 180;
}
function angle(a: Quaternion, b: Quaternion): number {
  return 2 * Math.acos(Math.min(1, Math.abs(a.dot(b)))) * DEG;
}

interface ArmVals {
  paw: number; // signed paw twist on the forearm bone
  bone: number; // signed twist of the twist bone on the forearm bone
  wrist: number; // signed twist of the paw on the twist bone
  swing: number;
  locals: Quaternion[]; // upper/chest, fore/upper, twist/fore, hand/twist
}

const demos = await probeDemos();
const out: Record<string, unknown>[] = [];
for (const role of chosen) {
  const source = FOLD_ROLES.get(role);
  if (!source) throw new Error(role);
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes);
    const bodies = roleBodies(source, scene);
    if (bodies.length === 0) continue;
    const audible = allAudible(scene.score);
    const buffer = createScenePose(scene.plan);
    const end = scene.score.durationSec;
    // The moves: the lift at the song start, the lowering at the song end, and a lowering and a
    // lift at each pause point.
    const points = Array.from({ length: pauses }, (_, k) => ((k + 1) * end) / (pauses + 1));
    type Move = { kind: 'lift' | 'lower'; at: number; samples: [number, number, Transport][] };
    const moves: Move[] = [];
    for (const at of [0, ...points]) {
      const count = countInAt(scene.plan.beats, at);
      const t: Transport = { ...PLAYING, changedAtWall: 10, startSec: at, leadSec: count.lengthSec };
      const samples: [number, number, Transport][] = [];
      for (let w = 0; w <= LIFT_FIT_SEC + 0.02; w += STEP) {
        samples.push([Math.min(at, at - count.lengthSec + w), 10 + w, t]);
      }
      moves.push({ kind: 'lift', at, samples });
    }
    for (const at of [...points, end]) {
      const before: Transport = { ...PLAYING, changedAtWall: 0 };
      const t: Transport = { ...PLAYING, playing: false, changedAtWall: 10, before, holdSec: 3 };
      const samples: [number, number, Transport][] = [];
      for (let w = 3; w <= 3 + LOWER_MAX_SEC + 0.02; w += STEP) {
        samples.push([at, 10 + w, t]);
      }
      moves.push({ kind: 'lower', at, samples });
    }
    for (const { index, model } of bodies) {
      const rig = model.studio;
      if (!rig) continue;
      const h = rig.body.heads;
      const sides = (['L', 'R'] as const).map((side) => ({
        side,
        chest: STUDIO_BONES.indexOf('chest'),
        upper: STUDIO_BONES.indexOf(`upper_arm_${side}`),
        fore: STUDIO_BONES.indexOf(`forearm_${side}`),
        twist: STUDIO_BONES.indexOf(`forearm_twist_${side}`),
        hand: STUDIO_BONES.indexOf(`hand_${side}`),
        axis: new Vector3(...h[`hand_${side}`]).sub(new Vector3(...h[`forearm_${side}`])).normalize(),
      }));
      const studio = createStudioPose();
      for (const move of moves) {
        const series: ArmVals[][] = [];
        for (const [song, wall, transport] of move.samples) {
          const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
          const pose = index === null ? frame.conductor : frame.players[index];
          if (!pose) continue;
          poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
          const m = studio.matrices;
          series.push(
            sides.map((s) => {
              const chest = turnOf(m, s.chest);
              const upper = turnOf(m, s.upper);
              const fore = turnOf(m, s.fore);
              const tb = turnOf(m, s.twist);
              const hand = turnOf(m, s.hand);
              const paw = fore.clone().invert().multiply(hand);
              const pawT = twistAngle(paw, s.axis);
              const swingQ = paw.clone().multiply(new Quaternion().setFromAxisAngle(s.axis, -pawT));
              const bone = twistAngle(fore.clone().invert().multiply(tb), s.axis);
              const wrist = twistAngle(tb.clone().invert().multiply(hand), s.axis);
              return {
                paw: pawT * DEG,
                bone: bone * DEG,
                wrist: wrist * DEG,
                swing: 2 * Math.acos(Math.min(1, Math.abs(swingQ.w))) * DEG,
                locals: [
                  chest.clone().invert().multiply(upper),
                  upper.clone().invert().multiply(fore),
                  fore.clone().invert().multiply(tb),
                  tb.clone().invert().multiply(hand),
                ],
              };
            }),
          );
        }
        for (const [k, s] of sides.entries()) {
          const vals = series.map((v) => v[k]!);
          const first = vals[0]!;
          const last = vals[vals.length - 1]!;
          let maxAbs = { paw: 0, bone: 0, wrist: 0, swing: 0 };
          let maxRate = [0, 0, 0, 0];
          let maxRateAt = [0, 0, 0, 0];
          let pawPath = 0;
          let maxAt = 0;
          for (const [i, v] of vals.entries()) {
            if (Math.abs(v.paw) > maxAbs.paw) maxAt = i;
            maxAbs = {
              paw: Math.max(maxAbs.paw, Math.abs(v.paw)),
              bone: Math.max(maxAbs.bone, Math.abs(v.bone)),
              wrist: Math.max(maxAbs.wrist, Math.abs(v.wrist)),
              swing: Math.max(maxAbs.swing, v.swing),
            };
            const prev = vals[i - 1];
            if (prev) {
              pawPath += wrap(v.paw - prev.paw);
              for (let j = 0; j < 4; j++) {
                const r = angle(prev.locals[j]!, v.locals[j]!) / STEP;
                if (r > maxRate[j]!) {
                  maxRate[j] = r;
                  maxRateAt[j] = i;
                }
              }
            }
          }
          out.push({
            role,
            demo: demo.file,
            player: index,
            side: s.side,
            kind: move.kind,
            at: Number(move.at.toFixed(2)),
            ends: { paw: [first.paw, last.paw], bone: [first.bone, last.bone], wrist: [first.wrist, last.wrist], swing: [first.swing, last.swing] },
            max: maxAbs,
            maxAtSec: Number((maxAt * STEP).toFixed(2)),
            pawPath,
            rate: { upper: maxRate[0], fore: maxRate[1], twist: maxRate[2], hand: maxRate[3] },
            rateAtSec: maxRateAt.map((i) => Number((i * STEP).toFixed(2))),
          });
        }
      }
    }
  }
}
if (jsonFile) {
  await writeFile(jsonFile, JSON.stringify(out, null, 1));
}
const r = (x: number) => Math.round(x);
for (const role of chosen) {
  for (const side of ['L', 'R']) {
    const rows = out.filter((o) => o.role === role && o.side === side) as any[];
    if (rows.length === 0) continue;
    const worstWrist = rows.reduce((a, b) => (b.max.wrist > a.max.wrist ? b : a));
    const worstRate = rows.reduce((a, b) => (Math.max(b.rate.twist, b.rate.hand) > Math.max(a.rate.twist, a.rate.hand) ? b : a));
    console.log(
      `${role} ${side} | wrist max ${r(worstWrist.max.wrist)} (${worstWrist.demo} ${worstWrist.kind}@${worstWrist.at}, t ${worstWrist.maxAtSec}) ends paw ${r(worstWrist.ends.paw[0])}->${r(worstWrist.ends.paw[1])} bone ${r(worstWrist.ends.bone[0])}->${r(worstWrist.ends.bone[1])} wrist ${r(worstWrist.ends.wrist[0])}->${r(worstWrist.ends.wrist[1])} pawmax ${r(worstWrist.max.paw)} path ${r(worstWrist.pawPath)} swing ${r(worstWrist.max.swing)} | rate max twist ${r(worstRate.rate.twist)} hand ${r(worstRate.rate.hand)} fore ${r(worstRate.rate.fore)} upper ${r(worstRate.rate.upper)} (${worstRate.demo} ${worstRate.kind}@${worstRate.at} t ${worstRate.rateAtSec.join('/')})`,
    );
  }
}
