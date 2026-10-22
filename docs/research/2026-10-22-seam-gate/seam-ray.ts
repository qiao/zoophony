/**
 * Ray measures of the trunk near each arm root: fins (thin trunk sheets) and notches (trunk walls
 * that face each other). Usage: node scratch/seam-ray.ts <role> [--every <n>] [--step <s>] [--json <file>]
 */
import { writeFileSync } from 'node:fs';

import { Vector3 } from 'three';

import { armJoints } from '../tools/arm-check.ts';
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { probeDemos } from '../tools/probe-demos.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';

const args = process.argv.slice(2);
const role = FOLD_ROLES.get(args[0] ?? '')!;
const opt = (k: string, d: string): string => (args.includes(k) ? args[args.indexOf(k) + 1]! : d);
const step = Number(opt('--step', '2'));
const every = Number(opt('--every', '10'));
const json = opt('--json', '');
const demos = await probeDemos();
const KS = [0.05, 0.1, 0.15, 0.2, 0.3];
const TRUNK = new Set(['hips', 'spine', 'spine1', 'chest', 'neck', 'clavicle_L', 'clavicle_R'].map((b) => STUDIO_BONES.indexOf(b as never)));

type Side = 'L' | 'R';
let prep: { trunkFaces: number[]; region: Record<Side, number[]>; upper: number; scale: number } | null = null;
let count = 0;
const out: { label: string; set: string; side: Side; m: Record<string, number> }[] = [];

function hit(o: Vector3, d: Vector3, a: Vector3, b: Vector3, c: Vector3): number {
  const e1 = b.clone().sub(a), e2 = c.clone().sub(a);
  const p = d.clone().cross(e2);
  const det = e1.dot(p);
  if (Math.abs(det) < 1e-12) return Infinity;
  const inv = 1 / det;
  const t0 = o.clone().sub(a);
  const u = t0.dot(p) * inv;
  if (u < 0 || u > 1) return Infinity;
  const q = t0.cross(e1);
  const v = d.dot(q) * inv;
  if (v < 0 || u + v > 1) return Infinity;
  const t = e2.dot(q) * inv;
  return t > 1e-6 ? t : Infinity;
}

probeFolds(role, demos, step, (rig, _studio, posed, _folded, set, label) => {
  count += 1;
  if (set !== 'rest' && count % every !== 0) return;
  const m = rig.mesh, C = m.corners, P = m.positions;
  const nf = C.length / 3, nv = P.length / 3;
  if (!prep) {
    const tw = new Float64Array(nv);
    for (let v = 0; v < nv; v++) for (let k = 0; k < 4; k++) if (TRUNK.has(m.joints[v * 4 + k]!)) tw[v]! += m.weights[v * 4 + k]!;
    const trunkFaces: number[] = [];
    for (let f = 0; f < nf; f++) if ([0, 1, 2].every((k) => tw[C[f * 3 + k]!]! >= 0.5)) trunkFaces.push(f);
    const h = rig.body.heads;
    const upper = new Vector3(...h.upper_arm_L).distanceTo(new Vector3(...h.forearm_L));
    const region: Record<Side, number[]> = { L: [], R: [] };
    for (const s of ['L', 'R'] as Side[]) {
      const sh = new Vector3(...h[`upper_arm_${s}`]);
      for (const f of trunkFaces) {
        const mid = new Vector3();
        for (let k = 0; k < 3; k++) mid.add(new Vector3().fromArray(P, C[f * 3 + k]! * 3));
        mid.divideScalar(3);
        if (mid.distanceTo(sh) < 1.2 * upper && Math.sign(mid.x) === Math.sign(sh.x)) region[s].push(f);
      }
    }
    prep = { trunkFaces, region, upper, scale: rig.body.scale };
    console.log(`trunk faces ${trunkFaces.length}, region L ${region.L.length} R ${region.R.length}, upper arm ${(upper * rig.body.scale * 100).toFixed(1)} cm`);
  }
  const pt = (f: number, k: number): Vector3 => new Vector3().fromArray(posed, C[f * 3 + k]! * 3);
  const tris = prep.trunkFaces.map((f) => [pt(f, 0), pt(f, 1), pt(f, 2)] as const);
  for (const side of ['L', 'R'] as Side[]) {
    const ms: Record<string, number> = {};
    for (const f of prep.region[side]) {
      const [a, b, c] = [pt(f, 0), pt(f, 1), pt(f, 2)];
      const n = b.clone().sub(a).cross(c.clone().sub(a));
      const area = (n.length() / 2) * prep.scale * prep.scale * 1e4;
      n.normalize();
      const o = a.clone().add(b).add(c).divideScalar(3);
      let inward = Infinity, outward = Infinity;
      for (const [i, t] of tris.entries()) {
        if (prep.trunkFaces[i] === f) continue;
        inward = Math.min(inward, hit(o, n.clone().negate(), t[0], t[1], t[2]));
        outward = Math.min(outward, hit(o, n, t[0], t[1], t[2]));
      }
      for (const k of KS) {
        if (inward < k * prep.upper) ms[`fin${k}`] = (ms[`fin${k}`] ?? 0) + area;
        if (outward < k * prep.upper) ms[`notch${k}`] = (ms[`notch${k}`] ?? 0) + area;
      }
    }
    out.push({ label, set, side, m: ms });
  }
});

const q = (xs: number[], f: number): number => {
  const t = xs.toSorted((x, y) => x - y);
  return t[Math.min(t.length - 1, Math.floor(f * t.length))] ?? 0;
};
const keys = KS.flatMap((k) => [`fin${k}`, `notch${k}`]);
for (const side of ['L', 'R'] as Side[]) {
  const ss = out.filter((o) => o.side === side);
  console.log(`${side} n ${ss.length} ` + keys.map((k) => `${k} ${q(ss.map((o) => o.m[k] ?? 0), 0.5).toFixed(0)}/${q(ss.map((o) => o.m[k] ?? 0), 0.95).toFixed(0)}`).join('  '));
}
if (json) writeFileSync(json, JSON.stringify(out));
