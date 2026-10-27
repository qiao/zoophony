/**
 * Measures the visible area of the cut caps of a mesh rig (the flat faces that close the trunk and
 * the arm where the cut removed the seam, `caps` of the studio body) from the back views of the
 * stage camera, over the rest, the play, and the lift of the harpist, and writes one image of the
 * caps in red. Usage: node scratch/caps-view.ts <out dir> [--step <s>]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

import { Vector3 } from 'three';

import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { probeDemos } from '../tools/probe-demos.ts';

const args = process.argv.slice(2);
const out = args[0]!;
const step = Number(args.includes('--step') ? args[args.indexOf('--step') + 1] : '2');
mkdirSync(out, { recursive: true });
const role = FOLD_ROLES.get('harpist')!;
const demos = (await probeDemos()).filter((d) => d.file.startsWith('boulanger-matin'));
const RES = 240;
const VIEWS: [number, number][] = [
  [180, 20], [-150, 20], [150, 20], [180, 40], [-150, 40], [150, 40],
];

function png(path: string, w: number, h: number, rgb: Uint8Array): void {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const crc = (b: Buffer): number => {
    let c = ~0;
    for (const x of b) {
      c ^= x;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

const depth = new Float32Array(RES * RES);
const ids = new Int32Array(RES * RES);
const rows: { set: string; label: string; area: number[] }[] = [];
let caps: Set<number> | null = null;
let wrote = false;
probeFolds(role, demos, step, (rig, _studio, posed, _folded, set, label) => {
  caps ??= new Set(rig.body.caps ?? []);
  const C = rig.mesh.corners;
  const nf = C.length / 3;
  const nv = posed.length / 3;
  const area: number[] = [];
  for (const [vi, [az, el]] of VIEWS.entries()) {
    const ar = (az * Math.PI) / 180;
    const er = (el * Math.PI) / 180;
    // The model faces -z and its left side is -x: az 0 looks at the front, az -90 at the left side.
    const cdir = new Vector3(Math.sin(ar) * Math.cos(er), Math.sin(er), -Math.cos(ar) * Math.cos(er));
    const right = new Vector3(0, 1, 0).cross(cdir).normalize();
    const up = cdir.clone().cross(right).normalize();
    const sx = new Float32Array(nv);
    const sy = new Float32Array(nv);
    const sz = new Float32Array(nv);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let v = 0; v < nv; v++) {
      const p = new Vector3(posed[v * 3]!, posed[v * 3 + 1]!, posed[v * 3 + 2]!);
      sx[v] = p.dot(right);
      sy[v] = p.dot(up);
      sz[v] = p.dot(cdir);
      x0 = Math.min(x0, sx[v]!);
      x1 = Math.max(x1, sx[v]!);
      y0 = Math.min(y0, sy[v]!);
      y1 = Math.max(y1, sy[v]!);
    }
    const span = Math.max(x1 - x0, y1 - y0) * 1.02;
    const px = span / RES;
    depth.fill(-Infinity);
    ids.fill(-1);
    for (let f = 0; f < nf; f++) {
      const [a, b, c] = [C[f * 3]!, C[f * 3 + 1]!, C[f * 3 + 2]!];
      const ax = (sx[a]! - x0) / px;
      const ay = (sy[a]! - y0) / px;
      const bx = (sx[b]! - x0) / px;
      const by = (sy[b]! - y0) / px;
      const cx = (sx[c]! - x0) / px;
      const cy = (sy[c]! - y0) / px;
      const d2 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (Math.abs(d2) < 1e-9) continue;
      for (let y = Math.max(0, Math.floor(Math.min(ay, by, cy))); y <= Math.min(RES - 1, Math.ceil(Math.max(ay, by, cy))); y++) {
        for (let x = Math.max(0, Math.floor(Math.min(ax, bx, cx))); x <= Math.min(RES - 1, Math.ceil(Math.max(ax, bx, cx))); x++) {
          const qx = x + 0.5;
          const qy = y + 0.5;
          const w0 = ((bx - qx) * (cy - qy) - (by - qy) * (cx - qx)) / d2;
          const w1 = ((cx - qx) * (ay - qy) - (cy - qy) * (ax - qx)) / d2;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const d = w0 * sz[a]! + w1 * sz[b]! + w2 * sz[c]!;
          const i = y * RES + x;
          if (d > depth[i]!) {
            depth[i] = d;
            ids[i] = f;
          }
        }
      }
    }
    let n = 0;
    for (let i = 0; i < RES * RES; i++) if (ids[i]! >= 0 && caps.has(ids[i]!)) n++;
    // The posed places are in meters.
    area.push(n * px * px * 1e4);
    if (!wrote && set === 'rest' && vi === 1) {
      const rgb = new Uint8Array(RES * RES * 3);
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < RES * RES; i++) if (ids[i]! >= 0) { lo = Math.min(lo, depth[i]!); hi = Math.max(hi, depth[i]!); }
      for (let y = 0; y < RES; y++) {
        for (let x = 0; x < RES; x++) {
          const i = (RES - 1 - y) * RES + x;
          const o = (y * RES + x) * 3;
          const f = ids[i]!;
          if (f < 0) { rgb.set([30, 30, 30], o); continue; }
          const g = 90 + Math.round((150 * (depth[i]! - lo)) / Math.max(1e-9, hi - lo));
          rgb.set(caps.has(f) ? [230, 20, 20] : [g, g, g], o);
        }
      }
      png(`${out}/caps-rest-az-150-e20.png`, RES, RES, rgb);
      wrote = true;
    }
  }
  rows.push({ set, label, area });
});
const q = (xs: number[], f: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(f * (s.length - 1)))]! : 0;
};
const lines = [`caps ${caps?.size ?? 0} faces, step ${step} s, boulanger-matin`, '| Set | View | p50 cm² | p95 cm² | max cm² |', '|---|---|---:|---:|---:|'];
for (const set of ['rest', 'play', 'lift']) {
  const rs = rows.filter((r) => r.set === set);
  if (!rs.length) continue;
  VIEWS.forEach(([az, el], vi) => {
    const xs = rs.map((r) => r.area[vi]!);
    lines.push(`| ${set} | az${az} e${el} | ${q(xs, 0.5).toFixed(1)} | ${q(xs, 0.95).toFixed(1)} | ${Math.max(...xs).toFixed(1)} |`);
  });
}
writeFileSync(`${out}/caps-view.txt`, lines.join('\n') + '\n');
console.log(lines.join('\n'));
