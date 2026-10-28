// Measures the right paw of the hippo bassist against its forearm over the play samples of the
// demos: the swing of the arm gate, the bend of the player hand off its forearm split into the
// flexion toward the palm and the turn in the plane of the palm, the PAW_TURN of the retarget,
// and the left over turn in the plane after it.
// Usage: node docs/research/2026-10-28-hippo-paw/probes/paw-swing.ts [--step <s>] [--set <changes>]
// [--grip hippo:<x>,<y>,<z>,<deg>] [--side R|L] [--json <file>]
import { writeFileSync } from 'node:fs';

import { Matrix4, Quaternion, Vector3 } from "three";

import { roleBodies } from '../../../../tools/fold-probe.ts';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { applyGrips } from '../../2026-10-17-grip-all/grip-set.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';
import {
  createStudioPose,
  palmTurnAngle,
  poseStudioBones,
  studioOffsets,
  twistAngle,
} from '../../../../src/models/studio-rig.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import { countInAt } from '../../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../../src/pose/test-scene.ts';

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const step = Number(opt('--step') ?? '0.25');
const side = (opt('--side') ?? 'R') as 'L' | 'R';
const sets = args.flatMap((a, i) => (args[i - 1] === '--set' ? [a] : []));
for (const s of sets) {
  setHolds(s);
}
const jsonOut = opt('--json');
console.log('grips', applyGrips(args).join(' ') || 'tree');

const DEG = 180 / Math.PI;
const demos = await probeDemos();
const rows: {
  demo: string;
  t: number;
  swing: number;
  bend: number;
  flex: number;
  plane: number;
  turn: number;
  left: number;
  twist: number;
}[] = [];

const turnOf = (m: ArrayLike<number>, b: number, out: Quaternion): Quaternion => {
  const x = new Vector3(m[b * 16] ?? 0, m[b * 16 + 1] ?? 0, m[b * 16 + 2] ?? 0);
  const y = new Vector3(m[b * 16 + 4] ?? 0, m[b * 16 + 5] ?? 0, m[b * 16 + 6] ?? 0);
  const z = new Vector3(m[b * 16 + 8] ?? 0, m[b * 16 + 9] ?? 0, m[b * 16 + 10] ?? 0);
  const mat = new Matrix4().makeBasis(
    x.normalize(),
    y.normalize(),
    z.normalize(),
  );
  return out.setFromRotationMatrix(mat);
};

for (const demo of demos) {
  const scene = sceneOf(demo.bytes);
  const bodies = roleBodies({ kind: 'player', instrument: 'contrabass', species: ['hippo'] }, scene);
  const body = bodies[0];
  if (!body || body.index === null || !body.model.studio) {
    continue;
  }
  const rig = body.model.studio;
  const arm = rig.arms[side];
  const skeleton = body.model.skeleton;
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const studio = createStudioPose();
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const foreBind = new Vector3().fromArray(arm.fore);
  const n = skeleton.positions.length;
  const rot = Array.from({ length: n }, () => new Quaternion());
  const place = Array.from({ length: n }, () => new Vector3());
  const local = new Quaternion();
  const off = new Vector3();
  for (let song = start; song <= scene.score.durationSec; song += step) {
    if (song < 0) {
      continue;
    }
    const frame = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer);
    const pose = frame.players[body.index];
    if (!pose) {
      continue;
    }
    for (let i = 0; i < n; i++) {
      local.fromArray(pose.rotations, i * 4);
      place[i]?.fromArray(skeleton.positions[i] ?? [0, 0, 0]);
      const p = skeleton.parents[i] ?? -1;
      if (p < 0 || p >= i) {
        rot[i]?.copy(local);
      } else {
        place[i]
          ?.sub(off.fromArray(skeleton.positions[p] ?? [0, 0, 0]))
          .applyQuaternion(rot[p] ?? local)
          .add(place[p] ?? off);
        rot[i]?.multiplyQuaternions(rot[p] ?? local, local);
      }
    }
    const elbow = place[boneIndex(side === 'R' ? 'forearmR' : 'forearmL')] ?? off;
    const wrist = place[boneIndex(side === 'R' ? 'handR' : 'handL')] ?? off;
    const hand = rot[boneIndex(side === 'R' ? 'handR' : 'handL')] ?? local;
    const f = new Vector3().subVectors(wrist, elbow).normalize();
    const fh = f.clone().applyQuaternion(hand.clone().invert());
    // The paw points along -y of the hand. The palm of the right hand faces -x, of the left +x.
    const palmSign = side === 'R' ? 1 : -1;
    const bend = Math.acos(Math.min(1, -fh.y)) * DEG;
    const flex = Math.asin(Math.max(-1, Math.min(1, palmSign * fh.x))) * DEG;
    const plane = Math.atan2(-fh.z, -fh.y) * DEG;
    const turn = palmTurnAngle(side, hand, f) * DEG;

    poseStudioBones(rig, skeleton, pose.rotations, studioOffsets(pose), 1, studio);
    const m = studio.matrices;
    const fore = turnOf(m, arm.bones.fore, new Quaternion());
    const handTurn = turnOf(m, arm.bones.hand, new Quaternion());
    const paw = fore.clone().invert().multiply(handTurn);
    const twist = twistAngle(paw, foreBind);
    const swingQ = paw.clone().multiply(new Quaternion().setFromAxisAngle(foreBind, -twist));
    const swing = 2 * Math.acos(Math.min(1, Math.abs(swingQ.w))) * DEG;
    rows.push({
      demo: demo.file,
      t: song,
      swing,
      bend,
      flex,
      plane,
      turn,
      left: plane - turn,
      twist: twist * DEG,
    });
  }
}

const pct = (values: number[], q: number): number => {
  const s = values.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1) + 0.5))] ?? 0;
};
const keys = ['swing', 'bend', 'flex', 'plane', 'turn', 'left', 'twist'] as const;
console.log(`samples ${rows.length}, step ${step} s, side ${side}, sets ${sets.join(' ') || 'none'}`);
console.log('| value | p5 | p50 | p95 | max |');
console.log('|---|---:|---:|---:|---:|');
for (const k of keys) {
  const v = rows.map((r) => r[k]);
  console.log(
    `| ${k} | ${pct(v, 0.05).toFixed(1)} | ${pct(v, 0.5).toFixed(1)} | ${pct(v, 0.95).toFixed(1)} | ${Math.max(...v).toFixed(1)} |`,
  );
}
const worst = rows.toSorted((a, b) => b.swing - a.swing).slice(0, 5);
for (const r of worst) {
  console.log(
    `worst ${r.demo} ${r.t.toFixed(2)} s: swing ${r.swing.toFixed(1)}, bend ${r.bend.toFixed(1)}, flex ${r.flex.toFixed(1)}, plane ${r.plane.toFixed(1)}, turn ${r.turn.toFixed(1)}, left ${r.left.toFixed(1)}`,
  );
}
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(rows));
}
void STUDIO_BONES;
