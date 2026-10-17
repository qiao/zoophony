/**
 * Measures the left arm of the cat violist at some times of a demo (research of 2026-10-17, round
 * `cat-hand`). It poses the first player of the sweep of the violist (`VIOLIST_SWEEP` of
 * `src/pose/test-sweep-roles.ts`) and prints the deepest point of the left upper arm, forearm, and
 * paw in the viola, with its bone (18 is `forearmL`, 19 is `handL`). It prints the shoulder
 * joint, the elbow, the wrist, and the finger joint, and the bend of the wrist: the angle between
 * the forearm and the paw. In the axes of the viola, it gives each point along the target
 * `fingerboard` from the nut (in its length L, 0.24 m), across the strings (+ to the bass side), and
 * up from the strings, in cm. With `SLICES=1`, it prints the extent of the viola for each 0.05 L.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-17-cat-hand/arm-probe.ts <demo> <time>... [--set <changes>]
 *
 * A time is a song time of the play, `w<wall>` for a wall time of the lowering after the song end,
 * or `rest`. `--set` takes the changes of `pnpm pose-depth --set`.
 */
import { Quaternion, Vector3 } from 'three';

import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { VIOLIST_SWEEP, playSample } from '../../../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { closedDepth } from '../../../src/pose/test-clearance.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import type { SweepSample } from '../../../src/pose/test-sweep.ts';
import { NOT_STARTED, PLAYING } from '../../../src/pose/test-scene.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';

const args = process.argv.slice(2);
const sets: string[] = [];
const rest: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--set') {
    sets.push(args[++i] ?? '');
  } else {
    rest.push(args[i] ?? '');
  }
}
const [demoId, ...songs] = rest;
if (sets.length > 0) {
  setHolds(sets.join(';'));
}
const demo = (await patchedDemos()).find((d) => d.file === `${demoId}.mid`);
if (!demo) {
  throw new Error('no demo');
}
const scene = sceneOf(demo.bytes);
const [player] = VIOLIST_SWEEP.players(scene);
if (!player) {
  throw new Error('no player');
}
const mesh = player.model.mesh;
const rig = bowedRig(player.model, 'viola', holdOf('cat', 'viola'));
const nut = new Vector3(...rig.nut);
const u = new Vector3(...rig.neck);
const neckLength = u.length();
u.normalize();
const t = new Vector3(...rig.top).normalize();
const sAx = new Vector3().crossVectors(t, new Vector3(...rig.axis)).normalize();
console.log(`stopRange ${rig.stopRange.map((v) => v.toFixed(2)).join('..')} neck ${neckLength.toFixed(3)} nut ${f0(nut)} u ${f0(u)} top ${f0(t)} across ${f0(sAx)} fingers ${rig.fingers.map((v) => v.toFixed(2))}`);
const vio = (v: Vector3): string => {
  const d = v.clone().sub(nut);
  return `[along ${(d.dot(u) / neckLength).toFixed(2)} L, across ${(d.dot(sAx) * 100).toFixed(1)} cm, up ${(d.dot(t) * 100).toFixed(1)} cm]`;
};
const want = new Set(['forearmL', 'handL', 'upperArmL'].map(boneIndex));
const corners: number[] = [];
for (let c = 0; c < mesh.bones.length; c++) {
  if (want.has(mesh.bones[c] ?? -1)) {
    corners.push(c);
  }
}
const viola = VIOLIST_SWEEP.obstacles.find((o) => o.name === 'viola');
if (!viola) {
  throw new Error('no viola');
}
const pos = (posed: ReturnType<typeof poseSkeleton>, bone: string): Vector3 =>
  posed.frames[boneIndex(bone as 'handL')]?.position.clone() ?? new Vector3();
function f0(v: Vector3): string {
  return `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
}
const f = (v: Vector3): string => `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
const deg = (a: Vector3, b: Vector3): string => (a.angleTo(b) / (Math.PI / 180)).toFixed(1);

const STOPPED = { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
for (const s of songs) {
  let sample: SweepSample;
  if (s.startsWith('w')) {
    sample = [scene.score.durationSec, Number(s.slice(1)), STOPPED];
  } else if (s === 'rest') {
    sample = [-1, 10, NOT_STARTED];
  } else {
    sample = playSample(scene, Number(s));
  }
  const posed = poseSkeleton(player.model, player.poseAt(sample));
  const surface = viola.surface(posed);
  const placed = corners.map((c) => new Vector3(...posedCorner(posed, c)));
  const { depth, index } = closedDepth(placed, surface);
  const point = placed[index] ?? new Vector3();
  const shoulder = pos(posed, 'upperArmL');
  const elbow = pos(posed, 'forearmL');
  const wrist = pos(posed, 'handL');
  const fingers = pos(posed, 'fingersL');
  const inst = posed.frames[boneIndex('instrument')];
  const rot = inst?.rotation ?? new Quaternion();
  const instPos = inst?.position ?? new Vector3();
  const inv = rot.clone().invert();
  const local = (v: Vector3): Vector3 =>
    v
      .clone()
      .sub(instPos)
      .applyQuaternion(inv)
      .add(new Vector3(...(player.model.skeleton.positions[boneIndex('instrument')] ?? [0, 0, 0])));
  const forearm = wrist.clone().sub(elbow);
  const hand = fingers.clone().sub(wrist);
  const pose = player.poseAt(sample);
  console.log(
    `song ${s}: depth ${(depth * 100).toFixed(1)} cm at ${f(point)} bone ${mesh.bones[corners[index] ?? 0]} local ${f(local(point))}`,
  );
  console.log(
    `  shoulder ${f(shoulder)} elbow ${f(elbow)} wrist ${f(wrist)} fingers ${f(fingers)} wrist bend ${deg(forearm, hand)} deg`,
  );
  console.log(
    `  viola axes: deepest ${vio(local(point))} elbow ${vio(local(elbow))} wrist ${vio(local(wrist))} fingers ${vio(local(fingers))}`,
  );
  void pose;
}

if (process.env.SLICES) {
  const posed = poseSkeleton(player.model, player.poseAt(playSample(scene, 223.3)));
  const surface = viola.surface(posed);
  const inst = posed.frames[boneIndex('instrument')];
  const rot = inst?.rotation ?? new Quaternion();
  const instPos = inst?.position ?? new Vector3();
  const inv = rot.clone().invert();
  const bind = new Vector3(...(player.model.skeleton.positions[boneIndex('instrument')] ?? [0, 0, 0]));
  const rows = new Map<number, { minA: number; maxA: number; minU: number; maxU: number }>();
  for (const tri of surface.triangles) {
    for (const p of [tri.a, tri.b, tri.c]) {
      const d = p.clone().sub(instPos).applyQuaternion(inv).add(bind).sub(nut);
      const along = d.dot(u) / neckLength;
      const key = Math.round(along * 20) / 20;
      const across = d.dot(sAx) * 100;
      const up = d.dot(t) * 100;
      const r = rows.get(key) ?? { minA: Infinity, maxA: -Infinity, minU: Infinity, maxU: -Infinity };
      r.minA = Math.min(r.minA, across);
      r.maxA = Math.max(r.maxA, across);
      r.minU = Math.min(r.minU, up);
      r.maxU = Math.max(r.maxU, up);
      rows.set(key, r);
    }
  }
  for (const [k, r] of [...rows].toSorted((a, b) => a[0] - b[0])) {
    console.log(`along ${k.toFixed(2)} L: across ${r.minA.toFixed(1)}..${r.maxA.toFixed(1)} cm, up ${r.minU.toFixed(1)}..${r.maxU.toFixed(1)} cm`);
  }
}
