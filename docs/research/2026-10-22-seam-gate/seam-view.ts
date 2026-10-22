/**
 * Visible seam measures: rasterizes the posed body from the back views and gives the visible area
 * of classes of seam faces. Usage: node scratch/seam-view.ts <role> [--step <s>] [--demo <id>]... [--json <file>]
 */
import { writeFileSync } from 'node:fs';

import { Quaternion, Vector3, Matrix4 } from 'three';

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
const RES = 160;
const VIEWS: [number, number][] = [
  [180, 20], [150, 20], [-150, 20], [180, 40], [150, 40], [-150, 40],
];

type Side = 'L' | 'R';
let prep: { side: Int8Array; caps: Set<number>; rim: Set<number>; bindN: Float64Array; bindE: Float64Array; armW: Float64Array; height: number } | null = null;
const out: { label: string; set: string; m: Record<string, number> }[] = [];
const worst: Record<string, { v: number; label: string }> = {};

function sv(e: ArrayLike<number>, o: number, f: ArrayLike<number>, q: number): [number, number] {
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

const depth = new Float32Array(RES * RES);
const ids = new Int32Array(RES * RES);

probeFolds(role, demos, step, (rig, studio, posed, _folded, set, label) => {
  const m = rig.mesh;
  const P = m.positions;
  const C = m.corners;
  const nf = C.length / 3;
  const nv = P.length / 3;
  if (!prep) {
    const caps = new Set(rig.body.caps ?? []);
    const rim = new Set(rig.body.rim ?? []);
    const side = new Int8Array(nf).fill(-1);
    const armW = new Float64Array(nv * 2);
    (['L', 'R'] as Side[]).forEach((s, si) => {
      const joints = armJoints(rig, s, false);
      for (let v = 0; v < nv; v++) {
        for (let k = 0; k < 4; k++) if (joints.includes(m.joints[v * 4 + k]!)) armW[v * 2 + si]! += m.weights[v * 4 + k]!;
      }
      for (let f = 0; f < nf; f++) {
        const w = [0, 1, 2].map((k) => armW[C[f * 3 + k]! * 2 + si]!);
        const mixed = Math.max(...w) > 0.02 && Math.min(...w) < 0.98;
        if (mixed || (caps.has(f) && Math.max(...w) > 0.02)) side[f] = si;
      }
    });
    const bindN = new Float64Array(nf * 3);
    const bindE = new Float64Array(nf * 6);
    let lo = Infinity, hi = -Infinity;
    for (let v = 0; v < nv; v++) { lo = Math.min(lo, P[v * 3 + 1]!); hi = Math.max(hi, P[v * 3 + 1]!); }
    for (let f = 0; f < nf; f++) {
      const [a, b, c] = [0, 1, 2].map((k) => C[f * 3 + k]!);
      const e1 = [0, 1, 2].map((i) => P[b! * 3 + i]! - P[a! * 3 + i]!);
      const e2 = [0, 1, 2].map((i) => P[c! * 3 + i]! - P[a! * 3 + i]!);
      bindE.set([...e1, ...e2], f * 6);
      const n = new Vector3().crossVectors(new Vector3(...e1), new Vector3(...e2)).normalize();
      bindN.set([n.x, n.y, n.z], f * 3);
    }
    prep = { side, caps, rim, bindN, bindE, armW, height: (hi - lo) * rig.body.scale };
    console.log(`seam faces L ${[...side].filter((s) => s === 0).length} R ${[...side].filter((s) => s === 1).length}, height ${prep.height.toFixed(2)} m`);
  }
  // Per-face classes for the seam faces.
  const mats = studio.matrices;
  const rot = new Map<number, Quaternion>();
  const rotOf = (j: number): Quaternion => {
    let q = rot.get(j);
    if (!q) {
      q = new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(Array.from({ length: 16 }, (_, k) => mats[j * 16 + k]!)));
      rot.set(j, q);
    }
    return q;
  };
  const cls = new Uint8Array(nf); // bits: 1 turn60, 2 turn90, 4 shear, 8 stretch2, 16 down
  const pe = new Float64Array(6);
  const v3 = new Vector3();
  for (let f = 0; f < nf; f++) {
    if (prep.side[f]! < 0) continue;
    const [a, b, c] = [0, 1, 2].map((k) => C[f * 3 + k]!);
    for (let i = 0; i < 3; i++) { pe[i] = posed[b! * 3 + i]! - posed[a! * 3 + i]!; pe[3 + i] = posed[c! * 3 + i]! - posed[a! * 3 + i]!; }
    const n = new Vector3(pe[1]! * pe[5]! - pe[2]! * pe[4]!, pe[2]! * pe[3]! - pe[0]! * pe[5]!, pe[0]! * pe[4]! - pe[1]! * pe[3]!).normalize();
    const mean = new Quaternion(0, 0, 0, 0);
    for (const v of [a!, b!, c!]) {
      for (let j = 0; j < 4; j++) {
        const w = m.weights[v * 4 + j]!;
        if (w === 0) continue;
        const q = rotOf(m.joints[v * 4 + j]!);
        const s = mean.x * q.x + mean.y * q.y + mean.z * q.z + mean.w * q.w < 0 ? -w : w;
        mean.set(mean.x + s * q.x, mean.y + s * q.y, mean.z + s * q.z, mean.w + s * q.w);
      }
    }
    mean.normalize();
    const exp = v3.fromArray(prep.bindN, f * 3).applyQuaternion(mean);
    const turn = (Math.acos(Math.max(-1, Math.min(1, exp.dot(n)))) * 180) / Math.PI;
    const [s1, s2] = sv(prep.bindE, f * 6, pe, 0);
    let k = 0;
    if (turn > 60) k |= 1;
    if (turn > 90) k |= 2;
    if (s1 / Math.max(1e-6, s2) > 3 && s1 > 1.5) k |= 4;
    if (s1 > 2) k |= 8;
    if (n.y < -0.3 && !prep.caps.has(f) && !prep.rim.has(f)) k |= 16;
    cls[f] = k | 128;
  }
  // Rasterize each view.
  const ms: Record<string, number> = {};
  const scale = rig.body.scale;
  for (const [az, el] of VIEWS) {
    const ar = (az * Math.PI) / 180, er = (el * Math.PI) / 180;
    const cdir = new Vector3(-Math.sin(ar) * Math.cos(er), Math.sin(er), -Math.cos(ar) * Math.cos(er));
    const right = new Vector3(0, 1, 0).cross(cdir).normalize();
    const up = cdir.clone().cross(right).normalize();
    const sx = new Float32Array(nv), sy = new Float32Array(nv), sz = new Float32Array(nv);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let v = 0; v < nv; v++) {
      const px = posed[v * 3]!, py = posed[v * 3 + 1]!, pz = posed[v * 3 + 2]!;
      sx[v] = px * right.x + py * right.y + pz * right.z;
      sy[v] = px * up.x + py * up.y + pz * up.z;
      sz[v] = px * cdir.x + py * cdir.y + pz * cdir.z;
      x0 = Math.min(x0, sx[v]!); x1 = Math.max(x1, sx[v]!); y0 = Math.min(y0, sy[v]!); y1 = Math.max(y1, sy[v]!);
    }
    const span = Math.max(x1 - x0, y1 - y0) * 1.02;
    const px = span / RES;
    depth.fill(-Infinity);
    ids.fill(-1);
    for (let f = 0; f < nf; f++) {
      const [a, b, c] = [C[f * 3]!, C[f * 3 + 1]!, C[f * 3 + 2]!];
      const ax = (sx[a]! - x0) / px, ay = (sy[a]! - y0) / px;
      const bx = (sx[b]! - x0) / px, by = (sy[b]! - y0) / px;
      const cx = (sx[c]! - x0) / px, cy = (sy[c]! - y0) / px;
      const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (Math.abs(area) < 1e-9) continue;
      const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(RES - 1, Math.ceil(Math.max(ax, bx, cx)));
      const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(RES - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const qx = x + 0.5, qy = y + 0.5;
          const w0 = ((bx - qx) * (cy - qy) - (by - qy) * (cx - qx)) / area;
          const w1 = ((cx - qx) * (ay - qy) - (cy - qy) * (ax - qx)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const d = w0 * sz[a]! + w1 * sz[b]! + w2 * sz[c]!;
          const i = y * RES + x;
          if (d > depth[i]!) { depth[i] = d; ids[i] = f; }
        }
      }
    }
    const pxArea = px * px * scale * scale * 1e4;
    const add = (key: string, v: number): void => { ms[key] = Math.max(ms[key] ?? 0, v); };
    const counts: Record<string, number> = { turn60: 0, turn90: 0, shear: 0, stretch: 0, down: 0, seam: 0, back: 0, backAll: 0 };
    for (let i = 0; i < RES * RES; i++) {
      const f = ids[i]!;
      if (f < 0) continue;
      const k = cls[f]!;
      const [a, b, c] = [C[f * 3]!, C[f * 3 + 1]!, C[f * 3 + 2]!];
      const e1 = [0, 1, 2].map((j) => posed[b * 3 + j]! - posed[a * 3 + j]!);
      const e2 = [0, 1, 2].map((j) => posed[c * 3 + j]! - posed[a * 3 + j]!);
      const nx = e1[1]! * e2[2]! - e1[2]! * e2[1]!, ny = e1[2]! * e2[0]! - e1[0]! * e2[2]!, nz = e1[0]! * e2[1]! - e1[1]! * e2[0]!;
      const facing = nx * cdir.x + ny * cdir.y + nz * cdir.z;
      if (facing < 0) { counts.backAll! += 1; if (k & 128) counts.back! += 1; }
      if (!(k & 128)) continue;
      counts.seam! += 1;
      if (k & 1) counts.turn60! += 1;
      if (k & 2) counts.turn90! += 1;
      if (k & 4) counts.shear! += 1;
      if (k & 8) counts.stretch! += 1;
      if (k & 16) counts.down! += 1;
    }
    for (const [key, n] of Object.entries(counts)) add(key, n * pxArea);
  }
  out.push({ label, set, m: ms });
  for (const [key, v] of Object.entries(ms)) {
    const k = `${set} ${key}`;
    if (!worst[k] || v > worst[k].v) worst[k] = { v, label };
  }
});

const q = (xs: number[], f: number): number => {
  const t = xs.toSorted((a, b) => a - b);
  return t[Math.min(t.length - 1, Math.floor(f * t.length))] ?? 0;
};
const keys = Object.keys(out[0]?.m ?? {});
for (const set of ['rest', 'play', 'lift']) {
  const ss = out.filter((o) => o.set === set);
  console.log(`${set} n ${ss.length} ${keys.map((k) => { const xs = ss.map((o) => o.m[k]!); return `${k} ${q(xs, 0.5).toFixed(0)}/${q(xs, 0.95).toFixed(0)}/${Math.max(...xs).toFixed(0)}`; }).join('  ')}`);
}
for (const [k, w] of Object.entries(worst)) console.log(`worst ${k} ${w.v.toFixed(1)} at ${w.label}`);
if (json) writeFileSync(json, JSON.stringify(out));
