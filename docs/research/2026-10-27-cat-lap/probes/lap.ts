/**
 * Measures the lap of the cat violist: the angles between the normals of neighbor faces (the
 * dihedral angles of the edges) in the band where the belly meets the thighs, in the seated bind
 * (`--bind`) or the poses of a set (`--pose <set>[@<n>]`), in the bind frame of the hips bone.
 * The band: the front half (d > 0), |x| < `--half` m, f from `--from` to `--to` of the line from
 * the hips joint to the neck joint. For each mesh: the count of the edges over 35° (the crease
 * angle of the cat, a hard edge) and over 25°, the largest angle, and the sum of the edge length
 * times the angle over 25° (cm deg). `--edges <n>` lists the largest edges. `--json <file>`
 * writes the edges of the first mesh for `lapplot.py`.
 *
 * Usage: node scratch/lap.ts (--bind | --pose <set>[@<n>]) [--from f] [--to f] [--half m]
 *   [--edges n] [--json file] [--demo id]
 */
import { writeFileSync } from 'node:fs';

import { Matrix4, Vector3 } from 'three';

import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../src/models/studio-rig.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { CLOSED_EYE_SCALE } from '../src/scene/player.ts';
import type { SweepSample } from '../src/pose/test-sweep.ts';

const args = process.argv.slice(2);
const opt = (n: string, f: string): string => (args.includes(n) ? args[args.indexOf(n) + 1]! : f);
const from = Number(opt('--from', '-0.1'));
const to = Number(opt('--to', '0.3'));
const half = Number(opt('--half', '0.1'));
const listed = Number(opt('--edges', '0'));
const ARM = ['upper_arm', 'forearm', 'hand', 'fingers'];

function mainBone(joints: Uint8Array, weights: Float32Array, corners: Uint32Array, t: number): string {
  const share = new Map<string, number>();
  for (let k = 0; k < 3; k++) {
    const v = corners[t * 3 + k]!;
    for (let j = 0; j < 4; j++) {
      const b = STUDIO_BONES[joints[v * 4 + j]!]!;
      share.set(b, (share.get(b) ?? 0) + weights[v * 4 + j]!);
    }
  }
  return [...share].sort((a, b) => b[1] - a[1])[0]![0];
}

interface Edge {
  angle: number;
  length: number;
  mid: [number, number, number];
  ends: [[number, number, number], [number, number, number]];
  bones: [string, string];
}

function measure(
  pos: Float64Array,
  corners: Uint32Array,
  bones: string[],
  hips: Vector3,
  neck: Vector3,
): Edge[] {
  const up = neck.clone().sub(hips);
  const len = up.length();
  up.normalize();
  const fwd = new Vector3(0, 0, -1).addScaledVector(up, up.z).normalize();
  const left = new Vector3().crossVectors(up, fwd).normalize();
  const nv = pos.length / 3;
  const local = new Float64Array(nv * 3);
  const p = new Vector3();
  for (let v = 0; v < nv; v++) {
    p.set(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!).sub(hips);
    local[v * 3] = p.dot(left);
    local[v * 3 + 1] = p.dot(up) / len;
    local[v * 3 + 2] = p.dot(fwd);
  }
  const nt = corners.length / 3;
  const normal = (t: number): Vector3 => {
    const [a, b, c] = [0, 1, 2].map((k) => {
      const v = corners[t * 3 + k]!;
      return new Vector3(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    });
    return new Vector3().subVectors(b!, a!).cross(new Vector3().subVectors(c!, a!)).normalize();
  };
  const edges = new Map<string, number[]>();
  for (let t = 0; t < nt; t++) {
    if (ARM.some((a) => bones[t]!.startsWith(a))) continue;
    for (let e = 0; e < 3; e++) {
      const a = corners[t * 3 + e]!;
      const b = corners[t * 3 + ((e + 1) % 3)]!;
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      edges.set(k, [...(edges.get(k) ?? []), t]);
    }
  }
  const out: Edge[] = [];
  for (const [key, faces] of edges) {
    if (faces.length !== 2) continue;
    const [a, b] = key.split(',').map(Number) as [number, number];
    const mid: [number, number, number] = [0, 1, 2].map(
      (k) => (local[a * 3 + k]! + local[b * 3 + k]!) / 2,
    ) as [number, number, number];
    if (mid[2] <= 0 || Math.abs(mid[0]) > half || mid[1] < from || mid[1] > to) continue;
    const d = Math.min(1, Math.max(-1, normal(faces[0]!).dot(normal(faces[1]!))));
    const length = Math.hypot(
      pos[a * 3]! - pos[b * 3]!,
      pos[a * 3 + 1]! - pos[b * 3 + 1]!,
      pos[a * 3 + 2]! - pos[b * 3 + 2]!,
    );
    out.push({
      angle: (Math.acos(d) * 180) / Math.PI,
      length,
      mid,
      ends: [
        [local[a * 3]!, local[a * 3 + 1]! * len, local[a * 3 + 2]!],
        [local[b * 3]!, local[b * 3 + 1]! * len, local[b * 3 + 2]!],
      ],
      bones: [bones[faces[0]!]!, bones[faces[1]!]!],
    });
  }
  return out;
}

function report(label: string, edges: Edge[]): void {
  const over35 = edges.filter((e) => e.angle > 35);
  const over25 = edges.filter((e) => e.angle > 25);
  const energy = edges.reduce((s, e) => s + Math.max(0, e.angle - 25) * e.length * 100, 0);
  const max = Math.max(...edges.map((e) => e.angle));
  console.log(
    `${label}: ${edges.length} edges, over 35° ${over35.length}, over 25° ${over25.length}, max ${max.toFixed(1)}°, crease sum ${energy.toFixed(0)} cm deg`,
  );
  for (const e of [...edges].sort((a, b) => b.angle - a.angle).slice(0, listed)) {
    console.log(
      `    ${e.angle.toFixed(1)}° len ${(e.length * 100).toFixed(1)} cm at x ${(e.mid[0] * 100).toFixed(1)} f ${e.mid[1].toFixed(3)} d ${(e.mid[2] * 100).toFixed(1)} cm (${e.bones.join(' | ')})`,
    );
  }
}

const role = SWEEP_ROLES['violist']!;
const demoName = opt('--demo', '');
const demos = (await probeDemos()).filter((d) => !demoName || d.file.startsWith(demoName));
for (const demo of demos) {
  const scene = sceneOf(demo.bytes);
  if (!role.hasRole(scene.score)) continue;
  const player = role.players(scene)[0]!;
  const rig = player.model.studio!;
  const sm = rig.mesh;
  const nt = sm.corners.length / 3;
  const bones = Array.from({ length: nt }, (_, t) => mainBone(sm.joints, sm.weights, sm.corners, t));
  const hips = new Vector3(...rig.body.heads.hips);
  const neck = new Vector3(...rig.body.heads.neck);
  let first = true;
  const emit = (label: string, pos: Float64Array): void => {
    const edges = measure(pos, sm.corners, bones, hips, neck);
    report(label, edges);
    if (first && args.includes('--json')) writeFileSync(opt('--json', ''), JSON.stringify(edges));
    first = false;
  };
  if (args.includes('--bind')) {
    emit(`bind (${demo.file})`, Float64Array.from(sm.positions));
    break;
  }
  const [setName, nth] = opt('--pose', 'rest').split('@');
  const set = role.sampleSets(scene).find((s) => s.name === setName)!;
  const every = Number(nth ?? '1');
  const samples = (set.samples as SweepSample[]).filter((_, i) => i % every === 0);
  const hipsIndex = STUDIO_BONES.indexOf('hips');
  for (const sample of samples) {
    const posed = poseSkeleton(player.model, player.poseAt(sample));
    const pose = poseStudioBones(
      rig,
      posed.model.skeleton,
      posed.pose.rotations,
      studioOffsets(posed.pose),
      Math.max(CLOSED_EYE_SCALE, 1 - posed.pose.blink),
      createStudioPose(),
    );
    const verts = skinStudioMesh(sm, pose);
    const m = new Matrix4().fromArray(pose.matrices, hipsIndex * 16).invert();
    const pos = new Float64Array(verts.length);
    const q = new Vector3();
    for (let v = 0; v < verts.length / 3; v++) {
      q.set(verts[v * 3]!, verts[v * 3 + 1]!, verts[v * 3 + 2]!).applyMatrix4(m);
      pos[v * 3] = q.x;
      pos[v * 3 + 1] = q.y;
      pos[v * 3 + 2] = q.z;
    }
    emit(`${setName} song ${sample[0].toFixed(2)} wall ${sample[1].toFixed(2)}`, pos);
  }
  break;
}
