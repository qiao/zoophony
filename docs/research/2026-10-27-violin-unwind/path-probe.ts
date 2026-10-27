// The path of the twist of the left paw and of the instrument in one lift of a demo, at steps of
// 0.01 s of the wall time. For each role: the rest and play studio twists of the paw from the bind,
// the number of wraps of the studio twist (a pass of 180°), the largest |twist| on the path, the
// largest step, the path and the direct turn of the instrument in the world, and the rest and play
// wrist bends that the viewer sees. --rest adds the rest joints in head heights.
// Usage: node docs/research/2026-10-27-violin-unwind/path-probe.ts [--set <changes>] [--demo <id>]
//        [--roles a,b] [--rest]
import { Matrix4, Quaternion, Vector3 } from 'three';

import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import {
  createStudioPose,
  palmTurnAngle,
  poseStudioBones,
  studioOffsets,
  twistAngle,
} from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';

const opt = (name: string): string | null => {
  const at = process.argv.indexOf(name);
  return at >= 0 ? (process.argv[at + 1] ?? null) : null;
};
const setText = opt('--set');
if (setText) {
  setHolds(setText);
}
const roles = (opt('--roles') ?? 'violinist,fox-violinist,violist').split(',');
const demos = await probeDemos();
const demo = demos.find((d) => d.file === `${opt('--demo') ?? 'mozart-k525'}.mid`);
if (!demo) {
  throw new Error('no demo');
}
const scene = sceneOf(demo.bytes);
const audible = allAudible(scene.score);
const buffer = createScenePose(scene.plan);
const lead = countInAt(scene.plan.beats, 0).lengthSec;
const studioCount = STUDIO_BONES.length;

function worldOf(
  parents: readonly number[],
  positions: readonly (readonly number[])[],
  rot: Float32Array,
): { q: Quaternion[]; p: Vector3[] } {
  const q: Quaternion[] = [];
  const p: Vector3[] = [];
  for (let i = 0; i < parents.length; i++) {
    const local = new Quaternion().fromArray(rot, i * 4);
    const parent = parents[i] ?? -1;
    const pos = new Vector3(...(positions[i] ?? [0, 0, 0]));
    if (parent < 0 || parent >= i) {
      q.push(local);
      p.push(pos);
    } else {
      const pq = q[parent] ?? new Quaternion();
      q.push(pq.clone().multiply(local));
      p.push(
        pos
          .sub(new Vector3(...(positions[parent] ?? [0, 0, 0])))
          .applyQuaternion(pq)
          .add(p[parent] ?? new Vector3()),
      );
    }
  }
  return { q, p };
}
const deg = (r: number): number => Math.round((r * 180) / Math.PI);
const turnOfM = (m: ArrayLike<number>, bone: number): Quaternion =>
  new Quaternion().setFromRotationMatrix(
    new Matrix4().fromArray(Array.from({ length: 16 }, (_, k) => m[bone * 16 + k] ?? 0)),
  );

for (const role of roles) {
  const source = FOLD_ROLES.get(role);
  const [body] = source ? roleBodies(source, scene) : [];
  if (!body || body.index === null || !body.model.studio) {
    continue;
  }
  const rig = body.model.studio;
  const foreBind = new Vector3(...rig.arms.L.fore).normalize();
  // A lift: the transport changes to playing at wall 10.
  const transport = { ...PLAYING, changedAtWall: 10 };
  const twists: number[] = [];
  const bends: number[] = [];
  const insts: Quaternion[] = [];
  let restInfo = '';
  const H = body.model.body.headHeight;
  const r = (v: Vector3): string => `(${(v.x / H).toFixed(2)},${(v.y / H).toFixed(2)},${(v.z / H).toFixed(2)})`;
  for (let k = 0; k <= 130; k++) {
    const wall = k * 0.01;
    const song = Math.min(0, -lead + wall);
    const frame = poseAt(scene.plan, song, 10 + wall, transport, audible, buffer);
    const pose = frame.players[body.index];
    if (!pose) {
      continue;
    }
    const { q, p } = worldOf(body.model.skeleton.parents, body.model.skeleton.positions, pose.rotations);
    const e = p[boneIndex('forearmL')] ?? new Vector3();
    const w = p[boneIndex('handL')] ?? new Vector3();
    const f = w.clone().sub(e).normalize();
    const sp0 = poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
    if (k === 0) {
      const sh = p[boneIndex('upperArmL')] ?? new Vector3();
      restInfo = `wrist ${r(w)} elbow ${r(e)} pivot ${r(new Vector3(...(body.model.skeleton.positions[boneIndex('instrument')] ?? [0, 0, 0])).applyMatrix4(new Matrix4().fromArray(Array.from({ length: 16 }, (_, j) => sp0.matrices[(studioCount + boneIndex('instrument')) * 16 + j] ?? 0))))} elbowAngle ${deg(Math.PI - e.clone().sub(sh).normalize().angleTo(f))}`;
    }
    const hand = q[boneIndex('handL')] ?? new Quaternion();
    const pawTurn = pose.pawTurnL ?? palmTurnAngle('L', hand, f);
    const seen = hand.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), pawTurn));
    const sp = poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
    insts.push(turnOfM(sp.matrices, studioCount + boneIndex('instrument')));
    twists.push(
      twistAngle(
        turnOfM(sp.matrices, STUDIO_BONES.indexOf('forearm_L')).invert().multiply(turnOfM(sp.matrices, STUDIO_BONES.indexOf('hand_L'))),
        foreBind,
      ),
    );
    bends.push(new Vector3(0, -1, 0).applyQuaternion(seen).angleTo(f));
  }
  let wraps = 0;
  let maxAbs = 0;
  let maxStep = 0;
  for (let k = 0; k < twists.length; k++) {
    const t = twists[k] ?? 0;
    maxAbs = Math.max(maxAbs, Math.abs(t));
    if (k > 0) {
      let d = t - (twists[k - 1] ?? 0);
      if (Math.abs(d) > Math.PI) {
        wraps++;
        d -= Math.sign(d) * 2 * Math.PI;
      }
      maxStep = Math.max(maxStep, Math.abs(d));
    }
  }
  let path = 0;
  for (let k = 1; k < insts.length; k++) {
    path += (insts[k - 1] ?? new Quaternion()).angleTo(insts[k] ?? new Quaternion());
  }
  const direct = (insts[0] ?? new Quaternion()).angleTo(insts.at(-1) ?? new Quaternion());
  console.log(
    `${role.padEnd(14)} twist ${deg(twists[0] ?? 0)} -> ${deg(twists.at(-1) ?? 0)} wraps ${wraps} max|t| ${deg(maxAbs)} maxStep ${deg(maxStep)} inst path ${deg(path)} direct ${deg(direct)} bend ${deg(bends[0] ?? 0)} -> ${deg(bends.at(-1) ?? 0)} maxBend ${deg(Math.max(...bends))}${process.argv.includes('--rest') ? '\n   ' + restInfo : ''}`,
  );
}
