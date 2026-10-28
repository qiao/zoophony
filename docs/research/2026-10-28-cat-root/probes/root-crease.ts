/**
 * Measures the crease at the front of the root of one upper arm of the cat violist: the valley
 * edges of the skin in front of the arm root, in the seated bind and in posed samples.
 *
 * The region: the vertices of the seated bind within `--reach` m (0.10) of the line of the upper
 * arm, from -0.1 to 0.75 of its length, and within 100 degrees of the front around it. Each edge
 * with both ends in the region and two faces gives its dihedral angle: the angle between the
 * normals of its faces, positive for a valley (the far corner of one face lies on the normal side
 * of the other face), negative for a ridge. The rows give, for each state: the count of valley
 * edges over 30 and over 45 degrees, the largest valley, the crease sum (the sum of the length in
 * cm times the valley angle over 20 degrees, cm deg), and the edges with the largest valley (the
 * share along the arm, the angle from the front, and the two end vertices).
 *
 * Usage: node scratch/root-crease.ts [--side L|R] [--reach <m>] [--top <n>] [--json <file>]
 *   [--at <demo>:<set>:<time or #index>]...
 */
import { writeFileSync } from 'node:fs';

import { Vector3 } from 'three';

import { probeDemos } from '../tools/probe-demos.ts';
import { setHolds } from '../tools/hold-sets.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES, playSample } from '../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../src/models/studio-rig.ts';
import { CLOSED_EYE_SCALE } from '../src/scene/player.ts';
import type { SweepSample } from '../src/pose/test-sweep.ts';

const args = process.argv.slice(2);
const opt = (n: string, f: string): string => (args.includes(n) ? args[args.indexOf(n) + 1]! : f);
const many = (n: string): string[] => args.flatMap((a, i) => (a === n ? [args[i + 1]!] : []));
const side = opt('--side', 'L');
const reach = Number(opt('--reach', '0.10'));
const top = Number(opt('--top', '4'));
setHolds(opt('--set', ''));
const DEFAULT_AT = [
  'boulanger-matin:rest:#0',
  'boulanger-matin:play:10',
  'boulanger-matin:play:30',
  'boulanger-matin:play:50',
  'boulanger-matin:play:70',
  'brahms-2:play:13.38',
  'boulanger-matin:lift:#5',
  'boulanger-matin:lift:#10',
  'boulanger-matin:lift:#15',
  'boulanger-matin:lower:#5',
  'boulanger-matin:lower:#10',
];
const ats = many('--at').length > 0 ? many('--at') : DEFAULT_AT;

const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const first = demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!;
const bindScene = sceneOf(first.bytes);
const bindRig = role.players(bindScene)[0]!.model.studio!;
const sm = bindRig.mesh;
const heads = bindRig.body.heads as Record<string, [number, number, number]>;
const S = new Vector3(...heads[`upper_arm_${side}`]!);
const E = new Vector3(...heads[`forearm_${side}`]!);
const u = E.clone().sub(S);
const lu = u.length();
u.normalize();
const front = new Vector3(0, 0, -1).addScaledVector(u, -new Vector3(0, 0, -1).dot(u)).normalize();
const upDir = new Vector3().crossVectors(front, u).normalize();
const sign = upDir.y >= 0 ? 1 : -1;

// Weld the corners by place, so that the split normals of the module do not split the edges.
const nv = sm.positions.length / 3;
const weldKey = new Map<string, number>();
const weld = new Uint32Array(nv);
for (let v = 0; v < nv; v++) {
  const k = [0, 1, 2].map((a) => Math.round(sm.positions[v * 3 + a]! / 1e-6)).join(',');
  const old = weldKey.get(k);
  weld[v] = old ?? v;
  if (old === undefined) weldKey.set(k, v);
}
const tris: number[][] = [];
for (let f = 0; f < sm.corners.length / 3; f++) {
  tris.push([0, 1, 2].map((k) => weld[sm.corners[f * 3 + k]!]!));
}

/** The share along the upper arm and the angle from the front (degrees) of a bind point. */
function where(p: Vector3): { t: number; ang: number; r: number } {
  const d = p.clone().sub(S);
  const t = d.dot(u) / lu;
  d.addScaledVector(u, -d.dot(u));
  const ang = (Math.atan2(sign * d.dot(upDir), d.dot(front)) * 180) / Math.PI;
  return { t, ang, r: d.length() };
}

const bindAt = (v: number): Vector3 =>
  new Vector3(sm.positions[v * 3]!, sm.positions[v * 3 + 1]!, sm.positions[v * 3 + 2]!);
const inRegion = new Uint8Array(nv);
for (let v = 0; v < nv; v++) {
  if (weld[v] !== v) continue;
  const w = where(bindAt(v));
  if (w.t >= -0.1 && w.t <= 0.75 && w.r <= reach && Math.abs(w.ang) <= 100) inRegion[v] = 1;
}
interface Edge {
  a: number;
  b: number;
  /** The far corners of the two faces. */
  c: number;
  d: number;
  faces: [number, number];
}
const edgeMap = new Map<string, { a: number; b: number; far: number[]; faces: number[] }>();
for (const [f, t] of tris.entries()) {
  for (let k = 0; k < 3; k++) {
    const a = t[k]!;
    const b = t[(k + 1) % 3]!;
    const c = t[(k + 2) % 3]!;
    if (!inRegion[a] || !inRegion[b]) continue;
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    const e = edgeMap.get(key) ?? { a: Math.min(a, b), b: Math.max(a, b), far: [], faces: [] };
    e.far.push(c);
    e.faces.push(f);
    edgeMap.set(key, e);
  }
}
const edges: Edge[] = [...edgeMap.values()]
  .filter((e) => e.far.length === 2)
  .map((e) => ({ a: e.a, b: e.b, c: e.far[0]!, d: e.far[1]!, faces: [e.faces[0]!, e.faces[1]!] }));

function normalOf(pos: ArrayLike<number>, f: number): Vector3 {
  const [a, b, c] = tris[f]!.map((v) => new Vector3(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!));
  return new Vector3().crossVectors(b!.clone().sub(a!), c!.clone().sub(a!)).normalize();
}

/** The dihedral angle of each edge in degrees: positive for a valley. */
function dihedrals(pos: ArrayLike<number>): Float64Array {
  const out = new Float64Array(edges.length);
  const p = (v: number): Vector3 => new Vector3(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!);
  for (const [i, e] of edges.entries()) {
    const n0 = normalOf(pos, e.faces[0]);
    const n1 = normalOf(pos, e.faces[1]);
    const angle = (Math.acos(Math.min(1, Math.max(-1, n0.dot(n1)))) * 180) / Math.PI;
    const mid = p(e.a).add(p(e.b)).multiplyScalar(0.5);
    const valley = p(e.d).sub(mid).dot(n0) > 0;
    out[i] = valley ? angle : -angle;
  }
  return out;
}

interface Row {
  label: string;
  /** The count of edges whose valley deepens more than 30 degrees from the bind. */
  deeper: number;
  /** The sum of the length (cm) times the deepening over 10 degrees. */
  deepSum: number;
  deepWorst: string[];
  over30: number;
  over45: number;
  largest: number;
  sum: number;
  worst: string[];
}

const bindAngles = dihedrals(sm.positions);

function rowOf(label: string, pos: ArrayLike<number>): Row {
  const angles = dihedrals(pos);
  const deep = angles.map((a, i) => a - bindAngles[i]!);
  const length = (e: Edge): number =>
    100 *
    Math.hypot(
      pos[e.a * 3]! - pos[e.b * 3]!,
      pos[e.a * 3 + 1]! - pos[e.b * 3 + 1]!,
      pos[e.a * 3 + 2]! - pos[e.b * 3 + 2]!,
    );
  let sum = 0;
  for (const [i, e] of edges.entries()) sum += length(e) * Math.max(0, angles[i]! - 20);
  const order = [...angles.keys()].sort((x, y) => angles[y]! - angles[x]!);
  const worst = order.slice(0, top).map((i) => {
    const e = edges[i]!;
    const w = where(bindAt(e.a).add(bindAt(e.b)).multiplyScalar(0.5));
    return `${angles[i]!.toFixed(0)}° t${w.t.toFixed(2)} a${w.ang.toFixed(0)} v${e.a}-${e.b}`;
  });
  let deepSum = 0;
  for (const [i, e] of edges.entries()) deepSum += length(e) * Math.max(0, deep[i]! - 10);
  const deepOrder = [...deep.keys()].sort((x, y) => deep[y]! - deep[x]!);
  const deepWorst = deepOrder.slice(0, top).map((i) => {
    const e = edges[i]!;
    const w = where(bindAt(e.a).add(bindAt(e.b)).multiplyScalar(0.5));
    return `+${deep[i]!.toFixed(0)}°(${angles[i]!.toFixed(0)}°) t${w.t.toFixed(2)} a${w.ang.toFixed(0)} v${e.a}-${e.b}`;
  });
  return {
    label,
    deeper: deep.filter((a) => a > 30).length,
    deepSum,
    deepWorst,
    over30: angles.filter((a) => a > 30).length,
    over45: angles.filter((a) => a > 45).length,
    largest: Math.max(...angles),
    sum,
    worst,
  };
}

const rows: Row[] = [rowOf('bind', sm.positions)];
for (const spec of ats) {
  const [demoId = '', setName = 'play', timeText = '0'] = spec.split(':');
  const demo = demos.find((d) => d.file.replace(/\.mid$/, '') === demoId);
  if (!demo) throw new Error(`no demo ${demoId}`);
  const scene = sceneOf(demo.bytes);
  const player = role.players(scene)[0]!;
  const rig = player.model.studio!;
  const time = Number(timeText.replace('#', ''));
  const sample: SweepSample | undefined =
    setName === 'play'
      ? playSample(scene, time)
      : ([...role.sampleSets(scene).find((s) => s.name === setName)!.samples].find((s, i) =>
          timeText.startsWith('#') ? i === time : Math.abs((s as SweepSample)[1] - time) < 0.06,
        ) as SweepSample | undefined);
  if (!sample) throw new Error(`no sample ${spec}`);
  const posed = poseSkeleton(player.model, player.poseAt(sample));
  const pose = poseStudioBones(
    rig,
    posed.model.skeleton,
    posed.pose.rotations,
    studioOffsets(posed.pose),
    Math.max(CLOSED_EYE_SCALE, 1 - posed.pose.blink),
    createStudioPose(),
  );
  rows.push(rowOf(spec.replace(/^boulanger-matin:/, ''), skinStudioMesh(rig.mesh, pose)));
}

console.log(
  `side ${side}: ${edges.length} edges in front of the arm root (reach ${reach} m). Valley edges over 30 and 45 degrees, the largest valley, the crease sum (cm deg over 20 degrees), and the largest valleys.`,
);
for (const r of rows) {
  console.log(
    `${r.label.padEnd(22)} ${String(r.over30).padStart(3)} ${String(r.over45).padStart(3)} ${r.largest.toFixed(0).padStart(4)}° ${r.sum.toFixed(0).padStart(6)}  ${r.worst.join('  ')}`,
  );
}
console.log('Deepening from the bind: the edges over 30 degrees, the sum (cm deg over 10 degrees), and the edges that deepen most (the posed angle in parentheses).');
for (const r of rows.slice(1)) {
  console.log(`${r.label.padEnd(22)} ${String(r.deeper).padStart(3)} ${r.deepSum.toFixed(0).padStart(6)}  ${r.deepWorst.join('  ')}`);
}
const json = opt('--json', '');
if (json) writeFileSync(json, JSON.stringify(rows, null, 1));
