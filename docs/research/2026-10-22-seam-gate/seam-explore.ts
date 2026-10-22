/**
 * Explores candidate measures of the seam between each arm and the trunk over the samples of
 * probeFolds(). Usage: node scratch/seam-explore.ts <role> [--step <s>] [--demo <id>]... [--json <file>]
 */
import { writeFileSync } from 'node:fs';

import { Matrix4, Quaternion, Vector3 } from 'three';

import { armJoints } from '../tools/arm-check.ts';
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { probeDemos } from '../tools/probe-demos.ts';

const args = process.argv.slice(2);
const role = FOLD_ROLES.get(args[0] ?? '')!;
const opt = (k: string, d: string): string => (args.includes(k) ? args[args.indexOf(k) + 1]! : d);
const step = Number(opt('--step', '1'));
const json = opt('--json', '');
const chosen = args.flatMap((a, i) => (args[i - 1] === '--demo' ? [a] : []));
const all = await probeDemos();
const demos = chosen.length > 0 ? all.filter((d) => chosen.some((c) => d.file.startsWith(c))) : all;

type Side = 'L' | 'R';
const SIDES: Side[] = ['L', 'R'];
interface Prep {
  faces: number[];
  caps: Set<number>;
  rim: Set<number>;
  armW: Float64Array;
  bindN: Float64Array;
  bindE: Float64Array; // e1x e1y e1z e2x e2y e2z
  edges: Int32Array; // a b f1 f2 (vertex, vertex, face, face)
  bindD: Float64Array; // signed dihedral of each edge in the bind, deg (+ convex, - concave)
}
function dihedral(P: ArrayLike<number>, C: ArrayLike<number>, a: number, b: number, f1: number, f2: number): number {
  const pt = (v: number): Vector3 => new Vector3(P[v * 3]!, P[v * 3 + 1]!, P[v * 3 + 2]!);
  const nrm = (f: number): Vector3 => {
    const [x, y, z] = [0, 1, 2].map((k) => pt(C[f * 3 + k]!));
    return new Vector3().crossVectors(y!.clone().sub(x!), z!.clone().sub(x!)).normalize();
  };
  const n1 = nrm(f1);
  const n2 = nrm(f2);
  const angle = (Math.acos(Math.max(-1, Math.min(1, n1.dot(n2)))) * 180) / Math.PI;
  const other = [0, 1, 2].map((k) => C[f2 * 3 + k]!).find((v) => v !== a && v !== b)!;
  const convex = pt(other).sub(pt(a)).dot(n1) <= 0;
  return convex ? angle : -angle;
}
let prep: Record<Side, Prep> | null = null;
let restE: Record<Side, Float64Array | null> = { L: null, R: null };
let lastDemo = '';
const out: { label: string; set: string; side: Side; m: Record<string, number> }[] = [];
const worst: Record<string, { v: number; label: string; faces: string[] }> = {};

const v3 = new Vector3();
function corner(P: ArrayLike<number>, v: number): [number, number, number] {
  return [P[v * 3]!, P[v * 3 + 1]!, P[v * 3 + 2]!];
}
function sv(e: ArrayLike<number>, o: number, f: ArrayLike<number>, q: number): [number, number] {
  // Singular values of the map from the triangle edges e (bind) to f (posed).
  const g = (a: ArrayLike<number>, i: number, b: ArrayLike<number>, j: number): number =>
    a[i]! * b[j]! + a[i + 1]! * b[j + 1]! + a[i + 2]! * b[j + 2]!;
  const b11 = g(e, o, e, o), b12 = g(e, o, e, o + 3), b22 = g(e, o + 3, e, o + 3);
  const p11 = g(f, q, f, q), p12 = g(f, q, f, q + 3), p22 = g(f, q + 3, f, q + 3);
  const det = b11 * b22 - b12 * b12;
  if (det <= 1e-14) return [1, 1];
  const i11 = b22 / det, i12 = -b12 / det, i22 = b11 / det;
  const m11 = i11 * p11 + i12 * p12, m12 = i11 * p12 + i12 * p22;
  const m21 = i12 * p11 + i22 * p12, m22 = i12 * p12 + i22 * p22;
  const tr = m11 + m22, dt = m11 * m22 - m12 * m21;
  const r = Math.sqrt(Math.max(0, (tr * tr) / 4 - dt));
  return [Math.sqrt(Math.max(0, tr / 2 + r)), Math.sqrt(Math.max(0, tr / 2 - r))];
}

probeFolds(role, demos, step, (rig, studio, posed, _folded, set, label) => {
  const m = rig.mesh;
  const P = m.positions;
  const C = m.corners;
  const nf = C.length / 3;
  if (!prep) {
    const caps = new Set(rig.body.caps ?? []);
    const rim = new Set(rig.body.rim ?? []);
    const make = (side: Side): Prep => {
      const joints = armJoints(rig, side, false);
      const nv = P.length / 3;
      const armW = new Float64Array(nv);
      for (let v = 0; v < nv; v++) {
        for (let k = 0; k < 4; k++) {
          if (joints.includes(m.joints[v * 4 + k]!)) armW[v]! += m.weights[v * 4 + k]!;
        }
      }
      const faces: number[] = [];
      for (let f = 0; f < nf; f++) {
        const w = [0, 1, 2].map((k) => armW[C[f * 3 + k]!]!);
        const mixed = Math.max(...w) > 0.02 && Math.min(...w) < 0.98;
        const cap = caps.has(f) && Math.max(...w) > 0.02;
        if (mixed || cap) faces.push(f);
      }
      const bindN = new Float64Array(faces.length * 3);
      const bindE = new Float64Array(faces.length * 6);
      faces.forEach((f, i) => {
        const [a, b, c] = [0, 1, 2].map((k) => corner(P, C[f * 3 + k]!));
        const e1 = [b![0] - a![0], b![1] - a![1], b![2] - a![2]];
        const e2 = [c![0] - a![0], c![1] - a![1], c![2] - a![2]];
        bindE.set([...e1, ...e2], i * 6);
        const n = new Vector3().crossVectors(new Vector3(...e1), new Vector3(...e2)).normalize();
        bindN.set([n.x, n.y, n.z], i * 3);
      });
      const inSet = new Set(faces);
      const byEdge = new Map<number, number[]>();
      for (let f = 0; f < nf; f++) {
        for (let k = 0; k < 3; k++) {
          const a = C[f * 3 + k]!;
          const b = C[f * 3 + ((k + 1) % 3)]!;
          const key = Math.min(a, b) * 100000 + Math.max(a, b);
          const list = byEdge.get(key) ?? [];
          list.push(f);
          byEdge.set(key, list);
        }
      }
      const el: number[] = [];
      for (const [key, fs] of byEdge) {
        if (fs.length !== 2 || (!inSet.has(fs[0]!) && !inSet.has(fs[1]!))) continue;
        el.push(Math.floor(key / 100000), key % 100000, fs[0]!, fs[1]!);
      }
      const edges = Int32Array.from(el);
      const bindD = new Float64Array(edges.length / 4);
      for (let e = 0; e < bindD.length; e++) {
        bindD[e] = dihedral(P, C, edges[e * 4]!, edges[e * 4 + 1]!, edges[e * 4 + 2]!, edges[e * 4 + 3]!);
      }
      return { faces, caps, rim, armW, bindN, bindE, edges, bindD };
    };
    prep = { L: make('L'), R: make('R') };
    console.log(`seam faces L ${prep.L.faces.length} R ${prep.R.faces.length}, caps ${caps.size}, rim ${rim.size}`);
  }
  const demo = label.split(' ')[0]!;
  if (demo !== lastDemo) {
    lastDemo = demo;
    restE = { L: null, R: null };
  }
  const mats = studio.matrices;
  const mat = (j: number): Matrix4 => new Matrix4().fromArray(Array.from({ length: 16 }, (_, k) => mats[j * 16 + k]!));
  const rot = new Map<number, Quaternion>();
  const rotOf = (j: number): Quaternion => {
    let q = rot.get(j);
    if (!q) {
      q = new Quaternion().setFromRotationMatrix(mat(j));
      rot.set(j, q);
    }
    return q;
  };
  for (const side of SIDES) {
    const p = prep[side];
    const posedE = new Float64Array(p.faces.length * 6);
    const ms: Record<string, number> = {
      down: 0, cc60: 0, cc90: 0, cv60: 0, cv90: 0, new60: 0, newcc45: 0, maxcc: 0, turn45: 0, turn60: 0, turn90: 0, sb2: 0, sb3: 0, sr2: 0, shear3: 0, shearR3: 0, area: 0,
    };
    const rows: { s: number; t: string }[] = [];
    p.faces.forEach((f, i) => {
      const [a, b, c] = [0, 1, 2].map((k) => corner(posed, C[f * 3 + k]!));
      const e1 = [b![0] - a![0], b![1] - a![1], b![2] - a![2]];
      const e2 = [c![0] - a![0], c![1] - a![1], c![2] - a![2]];
      posedE.set([...e1, ...e2], i * 6);
      const n = new Vector3().crossVectors(new Vector3(...e1), new Vector3(...e2));
      const area = n.length() / 2;
      n.normalize();
      // Expected normal: the bind normal turned by the weighted mean of the corner rotations.
      const mean = new Quaternion(0, 0, 0, 0);
      for (let k = 0; k < 3; k++) {
        const v = C[f * 3 + k]!;
        for (let j = 0; j < 4; j++) {
          const w = m.weights[v * 4 + j]!;
          if (w === 0) continue;
          const q = rotOf(m.joints[v * 4 + j]!);
          const s = mean.x * q.x + mean.y * q.y + mean.z * q.z + mean.w * q.w < 0 ? -w : w;
          mean.set(mean.x + s * q.x, mean.y + s * q.y, mean.z + s * q.z, mean.w + s * q.w);
        }
      }
      mean.normalize();
      const exp = v3.fromArray(p.bindN, i * 3).applyQuaternion(mean);
      const turn = (Math.acos(Math.max(-1, Math.min(1, exp.dot(n)))) * 180) / Math.PI;
      const [s1, s2] = sv(p.bindE, i * 6, posedE, i * 6);
      const rest = restE[side];
      const [r1, r2] = rest ? sv(rest, i * 6, posedE, i * 6) : [1, 1];
      const cm2 = area * 1e4;
      ms.area += cm2;
      const own = !p.caps.has(f) && !p.rim.has(f);
      if (own && n.y < -0.3) ms.down += cm2;
      if (turn > 45) ms.turn45 += cm2;
      if (turn > 60) ms.turn60 += cm2;
      if (turn > 90) ms.turn90 += cm2;
      if (s1 > 2) ms.sb2 += cm2;
      if (s1 > 3) ms.sb3 += cm2;
      if (r1 > 2) ms.sr2 += cm2;
      if (s1 / Math.max(1e-6, s2) > 3 && s1 > 1.5) ms.shear3 += cm2;
      if (r1 / Math.max(1e-6, r2) > 3 && r1 > 1.5) ms.shearR3 += cm2;
      rows.push({ s: turn > 60 ? cm2 : 0, t: `f${f}${p.caps.has(f) ? ' cap' : p.rim.has(f) ? ' rim' : ''} ${cm2.toFixed(1)}cm² turn ${turn.toFixed(0)} s ${s1.toFixed(2)}/${s2.toFixed(2)} r ${r1.toFixed(2)}/${r2.toFixed(2)} ny ${n.y.toFixed(2)} w ${[0, 1, 2].map((k) => p.armW[C[f * 3 + k]!]!.toFixed(2)).join(',')}` });
    });
    for (let e = 0; e < p.bindD.length; e++) {
      const [a, b, f1, f2] = [0, 1, 2, 3].map((k) => p.edges[e * 4 + k]!);
      const d = dihedral(posed, C, a!, b!, f1!, f2!);
      const len = Math.hypot(posed[a! * 3]! - posed[b! * 3]!, posed[a! * 3 + 1]! - posed[b! * 3 + 1]!, posed[a! * 3 + 2]! - posed[b! * 3 + 2]!) * 100;
      if (d < -60) ms.cc60 = (ms.cc60 ?? 0) + len;
      if (d < -90) ms.cc90 = (ms.cc90 ?? 0) + len;
      if (d > 60) ms.cv60 = (ms.cv60 ?? 0) + len;
      if (d > 90) ms.cv90 = (ms.cv90 ?? 0) + len;
      if (Math.abs(d - p.bindD[e]!) > 60) ms.new60 = (ms.new60 ?? 0) + len;
      if (d - p.bindD[e]! < -45) ms.newcc45 = (ms.newcc45 ?? 0) + len;
      ms.maxcc = Math.max(ms.maxcc ?? 0, -d);
    }
    if (set === 'rest') restE[side] = posedE;
    out.push({ label, set, side, m: ms });
    for (const key of Object.keys(ms)) {
      const k = `${set} ${side} ${key}`;
      if (!worst[k] || ms[key]! > worst[k].v) {
        worst[k] = { v: ms[key]!, label, faces: key === 'turn60' ? rows.toSorted((x, y) => y.s - x.s).slice(0, 8).map((r) => r.t) : [] };
      }
    }
  }
});

const q = (xs: number[], f: number): number => {
  const t = xs.toSorted((a, b) => a - b);
  return t[Math.min(t.length - 1, Math.floor(f * t.length))] ?? 0;
};
const keys = ['down', 'turn45', 'turn60', 'turn90', 'sb2', 'sb3', 'sr2', 'shear3', 'shearR3', 'area'];
console.log(`| set | side | n | ${keys.map((k) => `${k} p50/p95/max`).join(' | ')} |`);
for (const set of ['rest', 'play', 'lift']) {
  for (const side of SIDES) {
    const ss = out.filter((o) => o.set === set && o.side === side);
    console.log(`| ${set} | ${side} | ${ss.length} | ${keys.map((k) => { const xs = ss.map((o) => o.m[k]!); return `${q(xs, 0.5).toFixed(0)}/${q(xs, 0.95).toFixed(0)}/${Math.max(...xs).toFixed(0)}`; }).join(' | ')} |`);
  }
}
for (const side of SIDES) {
  const w = worst[`play ${side} turn60`];
  if (w) {
    console.log(`worst play ${side} turn60 ${w.v.toFixed(1)} at ${w.label}`);
    for (const t of w.faces) console.log('  ' + t);
  }
}
if (json) writeFileSync(json, JSON.stringify(out));
