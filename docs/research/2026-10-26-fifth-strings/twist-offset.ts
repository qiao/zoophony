// Compares the elbow-plane twist of the player left hand with the studio twist of the left paw,
// at rest, in the play, and in a lift. Usage: node scratch/twist-offset.ts [--set <changes>]
import { Matrix4, Quaternion, Vector3 } from 'three';

import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets, twistAngle } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';

const setAt = process.argv.indexOf('--set');
if (setAt >= 0) {
  setHolds(process.argv[setAt + 1] ?? '');
}
const demos = await probeDemos();
const demo = demos.find((d) => d.file === 'mozart-k525.mid');
if (!demo) {
  throw new Error('no demo');
}
const scene = sceneOf(demo.bytes);
const audible = allAudible(scene.score);
const buffer = createScenePose(scene.plan);
const lead = countInAt(scene.plan.beats, 0).lengthSec;

function worldOf(parents: readonly number[], positions: readonly (readonly number[])[], rot: Float32Array): { q: Quaternion[]; p: Vector3[] } {
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
      p.push(pos.sub(new Vector3(...(positions[parent] ?? [0, 0, 0]))).applyQuaternion(pq).add(p[parent] ?? new Vector3()));
    }
  }
  return { q, p };
}

function basis(a: Vector3, b: Vector3): Matrix4 {
  const x = a.clone().normalize();
  const y = b.clone().addScaledVector(x, -b.dot(x)).normalize();
  const z = new Vector3().crossVectors(x, y);
  return new Matrix4().makeBasis(x, y, z);
}

const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(0).padStart(5);
const studioCount = STUDIO_BONES.length;
for (const role of ['violinist', 'fox-violinist', 'violist']) {
  const source = FOLD_ROLES.get(role);
  const [body] = source ? roleBodies(source, scene) : [];
  if (!body || body.index === null || !body.model.studio) {
    continue;
  }
  const rig = body.model.studio;
  const foreBind = new Vector3(...rig.arms.L.fore).normalize();
  console.log(`== ${role}: wall, player elbow-plane twist, studio twist, difference`);
  const lift = { ...PLAYING, changedAtWall: 10 };
  for (const wall of [0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.5]) {
    const frame = poseAt(scene.plan, Math.min(0, -lead + wall), 10 + wall, lift, audible, buffer);
    const pose = frame.players[body.index];
    if (!pose) {
      continue;
    }
    const { q, p } = worldOf(body.model.skeleton.parents, body.model.skeleton.positions, pose.rotations);
    const s = p[boneIndex('upperArmL')] ?? new Vector3();
    const e = p[boneIndex('forearmL')] ?? new Vector3();
    const w = p[boneIndex('handL')] ?? new Vector3();
    const u = e.clone().sub(s).normalize();
    const f = w.clone().sub(e).normalize();
    const h = new Vector3().crossVectors(u, f).normalize();
    // The frame of the arm: (fore, hinge), from the bind (0,-1,0), (1,0,0).
    const from = basis(new Vector3(0, -1, 0), new Vector3(1, 0, 0));
    const to = basis(f, h);
    const A = new Quaternion().setFromRotationMatrix(to.multiply(from.invert()));
    const hand = q[boneIndex('handL')] ?? new Quaternion();
    const local = A.clone().invert().multiply(hand);
    const player = twistAngle(local, new Vector3(0, -1, 0));
    const studio = new Float32Array(0);
    void studio;
    const sp = poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
    const m = (bone: number): Quaternion =>
      new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(Array.from({ length: 16 }, (_, k) => sp.matrices[bone * 16 + k] ?? 0)));
    const st = twistAngle(m(STUDIO_BONES.indexOf('forearm_L')).invert().multiply(m(STUDIO_BONES.indexOf('hand_L'))), foreBind);
    let d = st - player;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    console.log(`${wall.toFixed(1)} ${deg(player)} ${deg(st)} ${deg(d)}`);
    void studioCount;
  }
}
