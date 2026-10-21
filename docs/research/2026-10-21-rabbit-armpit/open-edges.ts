/** Prints the open edges of the studio rabbit mesh, welded by position, in loops. */
import { STUDIO_BODIES } from '../src/models/studio-body.ts';
import { unpackStudioMesh } from '../src/models/studio-format.ts';

const name = ('studio-' + (process.argv[2] ?? 'rabbit')) as keyof typeof STUDIO_BODIES;
const body = STUDIO_BODIES[name];
const m = unpackStudioMesh(body.mesh);
const P = m.positions;
const key = (v: number): string => `${P[v * 3]!.toFixed(6)} ${P[v * 3 + 1]!.toFixed(6)} ${P[v * 3 + 2]!.toFixed(6)}`;
const weld = new Map<string, number>();
const id = (v: number): number => {
  const k = key(v);
  let w = weld.get(k);
  if (w === undefined) { w = v; weld.set(k, v); }
  return w;
};
const edges = new Map<string, { n: number; a: number; b: number; t: number[] }>();
const tris = m.corners.length / 3;
for (let t = 0; t < tris; t++) {
  for (let k = 0; k < 3; k++) {
    const a = id(m.corners[t * 3 + k]!);
    const b = id(m.corners[t * 3 + ((k + 1) % 3)]!);
    const e = a < b ? `${a}|${b}` : `${b}|${a}`;
    const x = edges.get(e);
    if (x) { x.n++; x.t.push(t); } else edges.set(e, { n: 1, a, b, t: [t] });
  }
}
const open = [...edges.values()].filter((e) => e.n === 1);
const many = [...edges.values()].filter((e) => e.n > 2);
console.log(`${name}: ${tris} triangles, ${weld.size} welded vertices, ${open.length} open edges, ${many.length} edges with more than 2 faces`);
const parent = new Map<number, number>();
const root = (v: number): number => { while (parent.get(v)! !== v) v = parent.get(v)!; return v; };
for (const e of open) { for (const v of [e.a, e.b]) if (!parent.has(v)) parent.set(v, v); parent.set(root(e.a), root(e.b)); }
const loops = new Map<number, typeof open>();
for (const e of open) { const r = root(e.a); loops.set(r, [...(loops.get(r) ?? []), e]); }
for (const loop of loops.values()) {
  let len = 0; const mid = [0, 0, 0];
  const vs = new Set<number>();
  for (const e of loop) {
    const p = [0, 1, 2].map((i) => P[e.a * 3 + i]!); const q = [0, 1, 2].map((i) => P[e.b * 3 + i]!);
    len += Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
    for (let i = 0; i < 3; i++) mid[i]! += (p[i]! + q[i]!) / 2 / loop.length;
    vs.add(e.a); vs.add(e.b);
  }
  console.log(`  ${loop.length} edges, ${len.toFixed(3)} m, middle ${mid.map((x) => x.toFixed(3)).join(', ')}, vertices ${[...vs].join(' ')}, faces ${loop.map((e) => e.t[0]).join(' ')}`);
}
for (const e of many) console.log(`  edge ${e.a}-${e.b} has ${e.n} faces: ${e.t.join(' ')}`);
