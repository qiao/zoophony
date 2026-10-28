import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const scene = sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes);
const mesh = role.players(scene)[0]!.model.mesh;
const P = mesh.positions;
const key = (c: number): string => `${P[c * 3]} ${P[c * 3 + 1]} ${P[c * 3 + 2]}`;
const edges = new Map<string, number[]>();
for (let t = 0; t < P.length / 9; t++) for (let k = 0; k < 3; k++) {
  const a = key(t * 3 + k); const b = key(t * 3 + ((k + 1) % 3));
  const kk = a < b ? `${a}|${b}` : `${b}|${a}`;
  edges.set(kk, [...(edges.get(kk) ?? []), t]);
}
for (const [k, ts] of edges) if (ts.length > 2) console.log('edge with', ts.length, 'tris', k.split('|').map((s) => s.split(' ').map((v) => Number(v).toFixed(3)).join(',')).join(' - '));
