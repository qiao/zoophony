/**
 * Measures the dents of the skin at the back of each arm root over the samples of the fold probe.
 *
 * For each vertex, the umbrella Laplacian (the mean of the neighbors less the vertex) along the
 * vertex normal gives its depth below its neighbors: a positive depth is a pit. The region of an
 * arm root is the vertices within `--radius` m of the posed shoulder joint whose normal points to
 * the back of the posed chest by more than 0.2. The dent volume is the sum of depth times vertex
 * area over the pits deeper than 1 mm, in cm³, and the deepest pit is in mm.
 * Usage: node scratch/dent.ts <role> [<demo prefix>] [--step <s>] [--radius <m>] [--obj <dir> --times <s,...>] [--glb-src]
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import { Matrix4, Vector3 } from 'three';

import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { probeDemos } from '../tools/probe-demos.ts';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string =>
  args.includes(name) ? args[args.indexOf(name) + 1]! : fallback;
const role = FOLD_ROLES.get(args[0]!)!;
const prefix = args[1] && !args[1].startsWith('--') ? args[1] : '';
const step = Number(opt('--step', '1'));
const radius = Number(opt('--radius', '0.1'));
const objDir = args.includes('--obj') ? opt('--obj', '') : null;
const times = opt('--times', '').split(',').filter(Boolean).map(Number);
if (objDir) mkdirSync(objDir, { recursive: true });
const demos = (await probeDemos()).filter((d) => d.file.startsWith(prefix));
const idx = (name: string): number => STUDIO_BONES.findIndex((b) => b === name);
let neighbors: number[][] | null = null;
type Row = { set: string; side: string; volume: number; deepest: number; crease: number; sharpest: number; hard: number };
let faceOf: Map<string, number> | null = null;
let edges: [number, number, number, number][] | null = null;
const rows: Row[] = [];
const m = new Matrix4();
const done = new Set<string>();
probeFolds(role, demos, step, (rig, studio, posed, _folded, set, label) => {
  const C = rig.mesh.corners;
  const nv = posed.length / 3;
  if (!neighbors) {
    const sets = Array.from({ length: nv }, () => new Set<number>());
    for (let f = 0; f < C.length; f += 3) {
      for (let k = 0; k < 3; k++) {
        const a = C[f + k]!;
        sets[a]!.add(C[f + ((k + 1) % 3)]!);
        sets[a]!.add(C[f + ((k + 2) % 3)]!);
      }
    }
    neighbors = sets.map((s) => [...s]);
  }
  if (!edges) {
    faceOf = new Map();
    const map = new Map<string, [number, number, number]>();
    edges = [];
    for (let f = 0; f < C.length; f += 3) {
      for (let k = 0; k < 3; k++) {
        const a = C[f + k]!;
        const b = C[f + ((k + 1) % 3)]!;
        const o = C[f + ((k + 2) % 3)]!;
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        const prev = map.get(key);
        if (prev) {
          edges.push([a, b, prev[2], o]);
          faceOf!.set(`${a},${b},${o}`, f / 3);
        } else {
          map.set(key, [a, b, o]);
          faceOf!.set(`${a},${b},${o}`, f / 3);
        }
      }
    }
  }
  const normal = new Float32Array(nv * 3);
  const area = new Float32Array(nv);
  const p = (i: number): Vector3 => new Vector3(posed[i * 3]!, posed[i * 3 + 1]!, posed[i * 3 + 2]!);
  for (let f = 0; f < C.length; f += 3) {
    const [a, b, c] = [C[f]!, C[f + 1]!, C[f + 2]!];
    const n = p(b).sub(p(a)).cross(p(c).sub(p(a)));
    const ar = n.length() / 2;
    for (const v of [a, b, c]) {
      normal[v * 3] += n.x;
      normal[v * 3 + 1] += n.y;
      normal[v * 3 + 2] += n.z;
      area[v] += ar / 3;
    }
  }
  const depth = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    const ns = neighbors[v]!;
    if (!ns.length) continue;
    const mean = new Vector3();
    for (const u of ns) mean.add(p(u));
    mean.multiplyScalar(1 / ns.length).sub(p(v));
    const n = new Vector3(normal[v * 3]!, normal[v * 3 + 1]!, normal[v * 3 + 2]!).normalize();
    depth[v] = mean.dot(n);
  }
  m.fromArray(studio.matrices, idx('chest') * 16);
  const back = new Vector3(0, 0, 1).transformDirection(m);
  const inRegion = new Uint8Array(nv);
  for (const side of ['L', 'R'] as const) {
    m.fromArray(studio.matrices, idx(`upper_arm_${side}`) * 16);
    const heads = rig.body.heads as unknown as Record<string, readonly [number, number, number]>;
    const s = new Vector3(...heads[`upper_arm_${side}`]!).applyMatrix4(m);
    let volume = 0;
    let deepest = 0;
    for (let v = 0; v < nv; v++) {
      if (p(v).distanceTo(s) > radius) continue;
      const n = new Vector3(normal[v * 3]!, normal[v * 3 + 1]!, normal[v * 3 + 2]!).normalize();
      if (n.dot(back) < 0.2) continue;
      inRegion[v] = 1;
      const d = depth[v]!;
      if (d > 0.001) {
        volume += d * area[v]! * 1e6;
        deepest = Math.max(deepest, d * 1000);
      }
    }
    let crease = 0;
    let sharpest = 0;
    let hard = 0;
    const rim = new Set(rig.body.rim ?? []);
    const creaseAngle = rig.body.crease;
    for (const [a, b, o1, o2] of edges) {
      if (!inRegion[a] || !inRegion[b]) continue;
      const pa = p(a);
      const pb = p(b);
      const n1 = pb.clone().sub(pa).cross(p(o1).sub(pa)).normalize();
      const n2 = p(o2).sub(pa).cross(pb.clone().sub(pa)).normalize();
      const angle = (Math.acos(Math.max(-1, Math.min(1, n1.dot(n2)))) * 180) / Math.PI;
      const concave = p(o2).sub(pa).dot(n1) > 0;
      const f1 = faceOf!.get(`${a},${b},${o1}`) ?? faceOf!.get(`${b},${a},${o1}`) ?? faceOf!.get(`${o1},${a},${b}`) ?? -1;
      const f2 = faceOf!.get(`${b},${a},${o2}`) ?? faceOf!.get(`${a},${b},${o2}`) ?? -1;
      if (angle > creaseAngle && !(rim.has(f1) && rim.has(f2))) hard += pa.distanceTo(pb) * 100;
      if (concave && angle > 20) {
        crease += angle * pa.distanceTo(pb) * 100;
        sharpest = Math.max(sharpest, angle);
      }
    }
    rows.push({ set, side, volume, deepest, crease, sharpest, hard });
    if (process.env.WORST && side === 'L' && deepest > Number(process.env.WORST)) console.log(`deep ${deepest.toFixed(1)} mm ${set} ${label}`);
  }
  const t = Number(/(-?[\d.]+) s$/.exec(label)?.[1]);
  const key = set === 'rest' ? 'rest' : set === 'play' && times.some((w) => Math.abs(w - t) < step / 2) ? `play-${t.toFixed(0)}` : '';
  if (objDir && key && !done.has(key)) {
    done.add(key);
    const lines: string[] = [];
    for (let v = 0; v < nv; v++) {
      const d = depth[v]! * 1000;
      const r = inRegion[v] ? 1 : 0.6;
      const col = d > 1 ? [1, Math.max(0, 1 - (d - 1) / 4), Math.max(0, 1 - (d - 1) / 4)] : d < -1 ? [Math.max(0, 1 + (d + 1) / 6), Math.max(0, 1 + (d + 1) / 6), 1] : [0.85, 0.85, 0.85];
      lines.push(`v ${posed[v * 3]!.toFixed(5)} ${posed[v * 3 + 1]!.toFixed(5)} ${posed[v * 3 + 2]!.toFixed(5)} ${col.map((x) => (x * r).toFixed(3)).join(' ')}`);
    }
    for (let f = 0; f < C.length; f += 3) lines.push(`f ${C[f]! + 1} ${C[f + 1]! + 1} ${C[f + 2]! + 1}`);
    writeFileSync(`${objDir}/${key}.obj`, lines.join('\n') + '\n');
  }
});
const q = (xs: number[], f: number): number => {
  const s = xs.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(f * (s.length - 1)))] ?? NaN;
};
console.log(`Dents at the back of the arm roots (radius ${radius} m, step ${step} s, ${demos.length} demos)`);
console.log('| Set | Side | n | volume p50 / p95 cm³ | deepest p50 / p95 mm | crease p50 / p95 °·cm | sharpest p50 / p95 ° | hard edges p50 / p95 cm |');
for (const set of ['rest', 'play', 'lift']) {
  for (const side of ['L', 'R']) {
    const rs = rows.filter((r) => r.set === set && r.side === side);
    if (!rs.length) continue;
    const f = (k: 'volume' | 'deepest' | 'crease' | 'sharpest' | 'hard', pr: number): string => q(rs.map((r) => r[k]), pr).toFixed(k === 'crease' || k === 'sharpest' || k === 'hard' ? 0 : 2);
    console.log(`| ${set} | ${side} | ${rs.length} | ${f('volume', 0.5)} / ${f('volume', 0.95)} | ${f('deepest', 0.5)} / ${f('deepest', 0.95)} | ${f('crease', 0.5)} / ${f('crease', 0.95)} | ${f('sharpest', 0.5)} / ${f('sharpest', 0.95)} | ${f('hard', 0.5)} / ${f('hard', 0.95)} |`);
  }
}
