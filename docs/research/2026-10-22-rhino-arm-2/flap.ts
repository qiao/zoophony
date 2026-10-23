/**
 * Finds the flap under each arm of the studio body of a role in the play samples. For each face
 * whose bind middle lies in the box of an armpit, it gives the posed area over the bind area, the
 * posed normal, and the arm weight of its corners. Prints the faces of the worst sample (the
 * largest stretched area) and the flap measures over the samples:
 * - stretch: the summed area of the box faces past 1.5 times their bind area, cm²;
 * - down: the summed area of the box faces whose posed normal points down (y < -0.5) and whose
 *   corners mix the arm and the trunk (arm weight of the corners differs by more than 0.3), cm².
 * - dragged down: the down area of the faces with a corner dragged more than 1 cm, cm² (the
 *   down faces that the arm moves, as a flap does; added in round `rhino-arm-2`).
 * Usage: node scratch/flap.ts <role> [--step <s>] [--demo <id>]... [--faces <n>] [--json <file>]
 */
import { writeFileSync } from 'node:fs';

import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { patchedDemos } from '../tools/patch-demos.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';

const args = process.argv.slice(2);
const role = FOLD_ROLES.get(args[0] ?? '')!;
const opt = (k: string, d: string): string => (args.includes(k) ? args[args.indexOf(k) + 1]! : d);
const step = Number(opt('--step', '0.5'));
const top = Number(opt('--faces', '25'));
const json = opt('--json', '');
const chosen = args.flatMap((a, i) => (args[i - 1] === '--demo' ? [`${a}.mid`] : []));
const all = await patchedDemos();
const demos = chosen.length > 0 ? all.filter((d) => chosen.includes(d.file)) : all;

const ARM = new Set<number>();
for (const [i, name] of STUDIO_BONES.entries()) {
  if (/^(upper_arm|forearm|forearm_twist|hand|fingers)_[LR]$/.test(name)) ARM.add(i);
}

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);

let box: number[] | null = null;
let armW: Float64Array | null = null;
let bindArea: Float64Array | null = null;
let caps = new Set<number>();
let rim = new Set<number>();
const samples: { label: string; set: string; drag: [number, number]; down: [number, number]; own: [number, number]; flap: [number, number]; dd: [number, number] }[] = [];
let worst = { score: -1, label: '', rows: [] as string[] };

probeFolds(role, demos, step, (rig, studio, posed, _folded, set, label) => {
  const m = rig.mesh;
  const P = m.positions;
  const C = m.corners;
  const nf = C.length / 3;
  const pt = (A: ArrayLike<number>, v: number): V3 => [A[v * 3]!, A[v * 3 + 1]!, A[v * 3 + 2]!];
  if (!box) {
    caps = new Set(rig.body.caps ?? []);
    rim = new Set(rig.body.rim ?? []);
    const nv = P.length / 3;
    armW = new Float64Array(nv);
    for (let v = 0; v < nv; v++) {
      for (let k = 0; k < 4; k++) {
        if (ARM.has(m.joints[v * 4 + k]!)) armW[v]! += m.weights[v * 4 + k]!;
      }
    }
    const sh = rig.positions.upperArmL;
    box = [];
    bindArea = new Float64Array(nf);
    for (let f = 0; f < nf; f++) {
      const vs = [C[f * 3]!, C[f * 3 + 1]!, C[f * 3 + 2]!];
      const [a, b, c] = vs.map((v) => pt(P, v)) as [V3, V3, V3];
      bindArea[f] = len(cross(sub(b, a), sub(c, a))) / 2;
      const mid = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      // The box of an armpit, in the units of the shoulder joint: out from 0.6 of its distance
      // from the middle plane, and from 0.6 to 1.05 of its height. Only the faces of the trunk
      // count: each corner has less than half of its weight on the arm.
      const x = Math.abs(mid[0]!);
      const trunk = vs.every((v) => armW![v]! < 0.5);
      if (trunk && x > 0.6 * Math.abs(sh[0]) && mid[1]! > 0.6 * sh[1] && mid[1]! < 1.05 * sh[1]) box.push(f);
    }
    console.log(`${box.length} trunk faces in the boxes, shoulder joint ${sh.map((x) => x.toFixed(3))}`);
  }
  // The drag of a vertex: the part of its skin move that the arm bones give past the clavicle of
  // their side, sum of w (M_arm - M_clavicle) p over the arm bones, cm.
  const mul = (k: number, p: V3): V3 => {
    const M = studio.matrices;
    const o = k * 16;
    return [
      M[o]! * p[0] + M[o + 4]! * p[1] + M[o + 8]! * p[2] + M[o + 12]!,
      M[o + 1]! * p[0] + M[o + 5]! * p[1] + M[o + 9]! * p[2] + M[o + 13]!,
      M[o + 2]! * p[0] + M[o + 6]! * p[1] + M[o + 10]! * p[2] + M[o + 14]!,
    ];
  };
  const drag = (v: number): number => {
    const p = pt(P, v);
    const sum: V3 = [0, 0, 0];
    for (let k = 0; k < 4; k++) {
      const j = m.joints[v * 4 + k]!;
      const w = m.weights[v * 4 + k]!;
      if (!ARM.has(j) || w === 0) continue;
      const clav = STUDIO_BONES.indexOf(STUDIO_BONES[j]!.endsWith('_L') ? 'clavicle_L' : 'clavicle_R');
      const d = sub(mul(j, p), mul(clav, p));
      for (let i = 0; i < 3; i++) sum[i] += w * d[i]!;
    }
    return len(sum) * 100;
  };
  const g: [number, number] = [0, 0];
  const d: [number, number] = [0, 0];
  const fl: [number, number] = [0, 0];
  const ow: [number, number] = [0, 0];
  const dd: [number, number] = [0, 0];
  const rows: { score: number; text: string }[] = [];
  for (const f of box) {
    const vs = [C[f * 3]!, C[f * 3 + 1]!, C[f * 3 + 2]!];
    const [a, b, c] = vs.map((v) => pt(posed, v)) as [V3, V3, V3];
    const n = cross(sub(b, a), sub(c, a));
    const area = len(n) / 2;
    const ny = n[1] / (len(n) || 1);
    const ds = vs.map(drag);
    const most = Math.max(...ds);
    const side = P[vs[0]! * 3]! < 0 ? 0 : 1;
    g[side] = Math.max(g[side], most);
    if (ny < -0.3) d[side] += area * 1e4;
    if (ny < -0.3 && !caps.has(f) && !rim.has(f)) ow[side] += area * 1e4;
    if (most > 2) fl[side] += area * 1e4;
    if (ny < -0.3 && most > 1) dd[side] += area * 1e4;
    const kind = caps.has(f) ? 'cap' : rim.has(f) ? 'rim' : '';
    rows.push({
      score: process.env.RANK === "down" ? (ny < -0.3 ? area * 1e4 : 0) : most > 2 ? area * 1e4 : 0,
      text: `face ${f} ${side ? 'R' : 'L'} ${kind} area ${(bindArea![f]! * 1e4).toFixed(1)}->${(area * 1e4).toFixed(1)} cm² ny ${ny.toFixed(2)} drag ${ds.map((x) => x.toFixed(1)).join(',')} cm arm w ${vs.map((v) => armW![v]!.toFixed(2)).join(',')}`,
    });
  }
  samples.push({ label, set, drag: g, down: d, own: ow, flap: fl, dd });
  const score = process.env.RANK === "down" ? d[0] + d[1] : fl[0] + fl[1];
  if (set === 'play' && score > worst.score) {
    worst = { score, label, rows: rows.toSorted((p, q) => q.score - p.score).slice(0, top).map((r) => r.text) };
  }
});

const q = (xs: number[], f: number): number => {
  const t = xs.toSorted((a, b) => a - b);
  return t[Math.min(t.length - 1, Math.floor(f * t.length))] ?? 0;
};
console.log(`Worst play sample: ${worst.label}, flap ${worst.score.toFixed(1)} cm²`);
for (const r of worst.rows) console.log('  ' + r);
console.log('drag: the largest move of a trunk vertex that the arm bones give past the clavicle, cm. down: the area of the trunk faces that face down (normal y < -0.3), cm². flap: the area of the trunk faces with a corner dragged more than 2 cm, cm². Each cell: p50 / p95.');
console.log('own: the down area of the faces that keep their own normals (no cap and no rim of the cut), cm².');
console.log('| Set | Samples | drag L | drag R | down L | down R | own L | own R | flap L | flap R | dragged down L | dragged down R |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const set of ['rest', 'play', 'lift']) {
  const ss = samples.filter((x) => x.set === set);
  const col = (g: (x: (typeof ss)[0]) => number): string => `${q(ss.map(g), 0.5).toFixed(1)} / ${q(ss.map(g), 0.95).toFixed(1)}`;
  console.log(`| ${set} | ${ss.length} | ${col((x) => x.drag[0])} | ${col((x) => x.drag[1])} | ${col((x) => x.down[0])} | ${col((x) => x.down[1])} | ${col((x) => x.own[0])} | ${col((x) => x.own[1])} | ${col((x) => x.flap[0])} | ${col((x) => x.flap[1])} | ${col((x) => x.dd[0])} | ${col((x) => x.dd[1])} |`);
}
if (json) writeFileSync(json, JSON.stringify(samples));
