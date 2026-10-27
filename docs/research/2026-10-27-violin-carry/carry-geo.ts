// The geometry of the carry of the violin and the viola in one lift of a demo, at steps of the
// wall time: the elbow-plane twist of the hand of the player, the studio twist of the left paw
// from the bind of the mesh, the turn of the paw in the plane of its palm (the pose value or the
// retarget turn), the change of the grip that the viewer sees from the rest, the forearm, the palm,
// and the fingers in the axes of the neck (ax: to the scroll, top: the normal of the top plate,
// fing: across the strings), and the wrist bend that the viewer sees.
// --brief prints one line for each role: the grip change, the rest and play bends and twists.
// --joints, --world, and --inst add the joints in H, the world axes, and the instrument axes.
// Usage: node docs/research/2026-10-27-violin-carry/carry-geo.ts [--set <changes>] [--demo <id>]
//        [--roles a,b] [--steps 0,0.5,1] [--brief] [--joints] [--world] [--inst]
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
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
import type { BowedInstrument } from '../../../src/pose/bowed-rig.ts';
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
const walls = (opt('--steps') ?? '0,0.3,0.4,0.5,0.6,0.65,0.7,0.75,0.8,0.9,1.0,1.5')
  .split(',')
  .map(Number);
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

const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(0).padStart(5);
const v3 = (v: Vector3): string =>
  `(${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)})`.padStart(19);
const angleOf = (q: Quaternion): number => 2 * Math.acos(Math.min(1, Math.abs(q.w)));
const axisOf = (q: Quaternion): Vector3 => {
  const s = Math.sign(q.w) || 1;
  return new Vector3(q.x * s, q.y * s, q.z * s).normalize();
};
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
  const instrument = (source?.kind === 'player' ? source.instrument : 'violin') as BowedInstrument;
  const species = source?.kind === 'player' ? (source.species[0] ?? 'rabbit') : 'rabbit';
  const points = bowedRig(body.model, instrument, holdOf(species, instrument));
  const nAxis = new Vector3(...points.axis);
  const nTop = new Vector3(...points.top);
  const nSide = new Vector3(...points.fingers);
  const inNeck = (v: Vector3): string =>
    `(ax ${v.dot(nAxis).toFixed(2)} top ${v.dot(nTop).toFixed(2)} fing ${v.dot(nSide).toFixed(2)})`;
  const foreBind = new Vector3(...rig.arms.L.fore).normalize();
  console.log(
    `== ${role}: wall | player twist | studio twist | paw turn | seen grip from rest (angle, axis in instr) | forearm in instr | wrist bend seen`,
  );
  const lift = { ...PLAYING, changedAtWall: 10 };
  let gripRest: Quaternion | null = null;
  let restBend = '';
  let restTwist = '';
  for (const wall of walls) {
    const frame = poseAt(scene.plan, Math.min(0, -lead + wall), 10 + wall, lift, audible, buffer);
    const pose = frame.players[body.index];
    if (!pose) {
      continue;
    }
    const { q, p } = worldOf(
      body.model.skeleton.parents,
      body.model.skeleton.positions,
      pose.rotations,
    );
    const s = p[boneIndex('upperArmL')] ?? new Vector3();
    const e = p[boneIndex('forearmL')] ?? new Vector3();
    const w = p[boneIndex('handL')] ?? new Vector3();
    const u = e.clone().sub(s).normalize();
    const f = w.clone().sub(e).normalize();
    const h = new Vector3().crossVectors(u, f).normalize();
    const basis = (a: Vector3, b: Vector3): Matrix4 => {
      const x = a.clone().normalize();
      const y = b.clone().addScaledVector(x, -b.dot(x)).normalize();
      return new Matrix4().makeBasis(x, y, new Vector3().crossVectors(x, y));
    };
    const from = basis(new Vector3(0, -1, 0), new Vector3(1, 0, 0));
    const A = new Quaternion().setFromRotationMatrix(basis(f, h).multiply(from.invert()));
    const hand = q[boneIndex('handL')] ?? new Quaternion();
    const player = twistAngle(A.clone().invert().multiply(hand), new Vector3(0, -1, 0));
    const pawTurn = pose.pawTurnL ?? palmTurnAngle('L', hand, f);
    const seen = hand
      .clone()
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), pawTurn));
    const sp = poseStudioBones(
      rig,
      body.model.skeleton,
      pose.rotations,
      studioOffsets(pose),
      1,
      createStudioPose(),
    );
    const inst = turnOfM(sp.matrices, studioCount + boneIndex('instrument'));
    const st = twistAngle(
      turnOfM(sp.matrices, STUDIO_BONES.indexOf('forearm_L'))
        .invert()
        .multiply(turnOfM(sp.matrices, STUDIO_BONES.indexOf('hand_L'))),
      foreBind,
    );
    const grip = inst.clone().invert().multiply(seen);
    gripRest ??= grip.clone();
    const change = gripRest.clone().invert().multiply(grip);
    // The change of the grip, in the axes of the instrument (the rest grip frame).
    const axis = axisOf(change).applyQuaternion(gripRest);
    const foreInst = f.clone().applyQuaternion(inst.clone().invert());
    const palmInst = new Vector3(1, 0, 0).applyQuaternion(seen).applyQuaternion(inst.clone().invert());
    const fingInst = new Vector3(0, -1, 0).applyQuaternion(seen).applyQuaternion(inst.clone().invert());
    const fingersSeen = new Vector3(0, -1, 0).applyQuaternion(seen);
    const bend = fingersSeen.angleTo(f);
    if (process.argv.includes('--joints')) {
      const H = body.model.body.headHeight;
      const r = (v: Vector3): string => `(${(v.x / H).toFixed(2)},${(v.y / H).toFixed(2)},${(v.z / H).toFixed(2)})`;
      console.log(`   H ${H.toFixed(3)} shoulder ${r(s)} elbow ${r(e)} wrist ${r(w)} upperLen ${(s.distanceTo(e) / H).toFixed(2)} foreLen ${(e.distanceTo(w) / H).toFixed(2)} s-w ${(s.distanceTo(w) / H).toFixed(2)} elbowAngle ${deg(Math.PI - u.angleTo(f))}`);
    }
    if (process.argv.includes('--inst')) {
      const ax = nAxis.clone().applyQuaternion(inst);
      const tp = nTop.clone().applyQuaternion(inst);
      console.log(`   inst axis ${v3(ax)} top ${v3(tp)} pawTurn ${deg(pawTurn)}`);
    }
    if (process.argv.includes('--world')) {
      const palmW = new Vector3(1, 0, 0).applyQuaternion(seen);
      const handPalm = new Vector3(1, 0, 0).applyQuaternion(hand);
      console.log(`   world: upper ${v3(u)} fore ${v3(f)} hinge ${v3(h)} palm(seen) ${v3(palmW)} palm(hand) ${v3(handPalm)} fingers(seen) ${v3(fingersSeen)} axis ${v3(nAxis.clone().applyQuaternion(inst))} top ${v3(nTop.clone().applyQuaternion(inst))} fing ${v3(nSide.clone().applyQuaternion(inst))}`);
    }
    if (process.argv.includes('--brief')) {
      if (wall === walls.at(-1)) {
        console.log(`${role.padEnd(14)} grip ${deg(angleOf(change))} restBend ${restBend} playBend ${deg(bend)} restTwist ${restTwist} playTwist ${deg(st)}`);
      } else if (wall === walls[0]) {
        restBend = deg(bend);
        restTwist = deg(st);
      }
      continue;
    }
    console.log(
      `${wall.toFixed(2)} ${deg(player)} ${deg(st)} ${deg(pawTurn)} ${deg(angleOf(change))} ${v3(axis)} fore ${inNeck(foreInst)} palm ${inNeck(palmInst)} fingers ${inNeck(fingInst)} ${deg(bend)}`,
    );
  }
}

