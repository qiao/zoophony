/**
 * Measures the groove under each armpit of the studio body of a role over the play samples: the
 * largest concave angle between two faces that share an edge, of the faces with a corner in the
 * box of the armpit in the bind, and the deepest dent of a vertex there (the vertex minus the mean
 * of its neighbors, along its normal). Prints p50 and p95 for each set, and the worst sample.
 * Usage: node scratch/groove.ts <role> [--step <s>] [--side L|R] [--demo <id>]...
 */
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { patchedDemos } from '../tools/patch-demos.ts';

const args = process.argv.slice(2);
const role = FOLD_ROLES.get(args[0] ?? '')!;
const opt = (k: string, d: string): string => (args.includes(k) ? args[args.indexOf(k) + 1]! : d);
const step = Number(opt('--step', '0.5'));
const side = opt('--side', 'R');
const chosen = args.flatMap((a, i) => (args[i - 1] === '--demo' ? [a.endsWith('.mid') ? a : `${a}.mid`] : []));
const all = await patchedDemos();
const demos = chosen.length > 0 ? all.filter((d) => chosen.includes(d.file)) : all;
const sign = side === 'R' ? 1 : -1;
// The box of the trunk under the armpit in the bind of the studio, meters (x mirrored for L).
const BOX = { x: [0.1, 0.24], y: [0.6, 0.78], z: [-0.22, -0.02] };

type Edge = { a: number; b: number; c: number; d: number };
let edges: Edge[] | null = null;
let verts: number[] = [];
let nbrs = new Map<number, number[]>();
const stats = new Map<string, { angle: number[]; dent: number[]; worst: number; label: string; edge: string }>();
let rep: Int32Array | null = null;

probeFolds(role, demos, step, (rig, _studio, posed, _folded, set, label) => {
  const mesh = rig.mesh;
  const P = mesh.positions;
  if (!edges) {
    const n = P.length / 3;
    rep = new Int32Array(n);
    const keys = new Map<string, number>();
    for (let v = 0; v < n; v++) {
      const k = `${P[v * 3]!.toFixed(6)} ${P[v * 3 + 1]!.toFixed(6)} ${P[v * 3 + 2]!.toFixed(6)}`;
      rep[v] = keys.get(k) ?? v;
      if (!keys.has(k)) keys.set(k, v);
    }
    const inBox = (v: number): boolean => {
      const x = P[v * 3]! * sign;
      const y = P[v * 3 + 1]!;
      const z = P[v * 3 + 2]!;
      return x > BOX.x[0] && x < BOX.x[1] && y > BOX.y[0] && y < BOX.y[1] && z > BOX.z[0] && z < BOX.z[1];
    };
    const map = new Map<string, { a: number; b: number; c: number; f: number }[]>();
    const faces = mesh.corners.length / 3;
    const vs = new Set<number>();
    for (let f = 0; f < faces; f++) {
      const t = [0, 1, 2].map((k) => rep![mesh.corners[f * 3 + k]!]!);
      if (!t.some(inBox)) continue;
      for (let k = 0; k < 3; k++) {
        const a = t[k]!;
        const b = t[(k + 1) % 3]!;
        const c = t[(k + 2) % 3]!;
        const key = a < b ? `${a} ${b}` : `${b} ${a}`;
        map.set(key, [...(map.get(key) ?? []), { a, b, c, f }]);
        if (inBox(a)) vs.add(a);
        const l = nbrs.get(a) ?? [];
        if (!l.includes(b)) l.push(b);
        nbrs.set(a, l);
        const l2 = nbrs.get(b) ?? [];
        if (!l2.includes(a)) l2.push(a);
        nbrs.set(b, l2);
      }
    }
    edges = [];
    for (const list of map.values()) {
      if (list.length === 2) {
        const [e1, e2] = list as [typeof list[0], typeof list[0]];
        edges.push({ a: e1.a, b: e1.b, c: e1.c, d: e2.c });
      }
    }
    verts = [...vs];
  }
  const p = (v: number): [number, number, number] => [posed[v * 3]!, posed[v * 3 + 1]!, posed[v * 3 + 2]!];
  const sub = (u: number[], w: number[]): number[] => [u[0]! - w[0]!, u[1]! - w[1]!, u[2]! - w[2]!];
  const cross = (u: number[], w: number[]): number[] => [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
  const dot = (u: number[], w: number[]): number => u[0]! * w[0]! + u[1]! * w[1]! + u[2]! * w[2]!;
  const unit = (u: number[]): number[] => { const l = Math.hypot(u[0]!, u[1]!, u[2]!) || 1; return u.map((x) => x / l); };
  let worst = 0;
  let worstEdge = '';
  const bp = (v: number): [number, number, number] => [P[v * 3]!, P[v * 3 + 1]!, P[v * 3 + 2]!];
  const angleOf = (q: typeof p, e: Edge): number => {
    const A = q(e.a); const B = q(e.b); const Cc = q(e.c); const D = q(e.d);
    const n1 = unit(cross(sub(B, A), sub(Cc, A)));
    const n2 = unit(cross(sub(A, B), sub(D, B)));
    const angle = (Math.acos(Math.max(-1, Math.min(1, dot(n1, n2)))) * 180) / Math.PI;
    return dot(n1, sub(D, A)) > 0 ? angle : -angle;
  };
  for (const e of edges) {
    const grow = angleOf(p, e) - Math.max(0, angleOf(bp, e));
    if (grow > worst) { worst = grow; worstEdge = `${e.a}-${e.b} at ${bp(e.a).map((x) => x.toFixed(3))}`; }
  }
  for (const e of [] as Edge[]) {
    const A = p(e.a); const B = p(e.b); const Cc = p(e.c); const D = p(e.d);
    const n1 = unit(cross(sub(B, A), sub(Cc, A)));
    const n2 = unit(cross(sub(A, B), sub(D, B)));
    const angle = (Math.acos(Math.max(-1, Math.min(1, dot(n1, n2)))) * 180) / Math.PI;
    const concave = dot(n1, sub(D, A)) > 0;
    if (concave && angle > worst) { worst = angle; worstEdge = `${e.a}-${e.b}`; }
  }
  let dent = 0;
  for (const v of verts) {
    const ns = nbrs.get(v) ?? [];
    if (ns.length < 3) continue;
    const mean = [0, 0, 0];
    for (const w of ns) { const q = p(w); for (let i = 0; i < 3; i++) mean[i]! += q[i]! / ns.length; }
    // The normal of the vertex: the sum of the face normals around it, from the fan of edges.
    const V = p(v);
    const off = sub(V, mean);
    // Sign: negative when the vertex lies inside the local surface, by the normal of the bind.
    const bn = [rig.mesh.positions[v * 3]! * sign - 0.0, 0, 0];
    void bn;
    let nsum = [0, 0, 0];
    for (const e of edges) {
      if (e.a !== v && e.b !== v) continue;
      const n1 = cross(sub(p(e.b), p(e.a)), sub(p(e.c), p(e.a)));
      nsum = [nsum[0]! + n1[0]!, nsum[1]! + n1[1]!, nsum[2]! + n1[2]!];
    }
    const d = dot(off, unit(nsum)) * 1000;
    if (d < dent) dent = d;
  }
  const s = stats.get(set) ?? { angle: [], dent: [], worst: 0, label: '', edge: '' };
  s.angle.push(worst);
  s.dent.push(dent);
  if (worst > s.worst) { s.worst = worst; s.label = label; s.edge = worstEdge; }
  stats.set(set, s);
});
const q = (xs: number[], f: number): number => { const s = xs.toSorted((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(f * s.length))] ?? 0; };
console.log(`Groove of the ${side} armpit, ${verts.length} vertices and ${edges?.length ?? 0} edges in the box, step ${step} s.`);
console.log('| Set | Samples | concave growth over the bind p50 | p95 | worst (sample, edge) | dent p50 mm | dent p5 mm |');
console.log('|---|---:|---:|---:|---|---:|---:|');
for (const [set, s] of stats) {
  console.log(`| ${set} | ${s.angle.length} | ${q(s.angle, 0.5).toFixed(0)} | ${q(s.angle, 0.95).toFixed(0)} | ${s.worst.toFixed(0)} (${s.label}, ${s.edge}) | ${q(s.dent, 0.5).toFixed(1)} | ${q(s.dent, 0.05).toFixed(1)} |`);
}
