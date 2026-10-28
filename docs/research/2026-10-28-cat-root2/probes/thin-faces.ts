/** Lists the faces of the cat violist body near given vertices (welded by place): the corners, the
 * smallest corner angle, the area, and the bind normal; and the thin faces (smallest corner under
 * --thin degrees) within --reach m of the vertices. Usage: node scratch/thin-faces.ts <v>... [--thin 12] [--reach 0.03] */
import { Vector3 } from 'three';
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
const args = process.argv.slice(2);
const opt = (n: string, f: string): string => (args.includes(n) ? args[args.indexOf(n) + 1]! : f);
const thin = Number(opt('--thin', '12'));
const reach = Number(opt('--reach', '0.03'));
const ids = args.filter((a, i) => !a.startsWith('--') && !['--thin', '--reach'].includes(args[i - 1]!)).map(Number);
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const scene = sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes);
const sm = role.players(scene)[0]!.model.studio!.mesh;
const nv = sm.positions.length / 3;
const weldKey = new Map<string, number>();
const weld = new Uint32Array(nv);
for (let v = 0; v < nv; v++) {
  const k = [0, 1, 2].map((a) => Math.round(sm.positions[v * 3 + a]! / 1e-6)).join(',');
  const old = weldKey.get(k);
  weld[v] = old ?? v;
  if (old === undefined) weldKey.set(k, v);
}
const P = (v: number): Vector3 => new Vector3(sm.positions[v * 3]!, sm.positions[v * 3 + 1]!, sm.positions[v * 3 + 2]!);
const nf = sm.corners.length / 3;
const info = (f: number): string => {
  const t = [0, 1, 2].map((k) => weld[sm.corners[f * 3 + k]!]!);
  const p = t.map(P);
  const ang = [0, 1, 2].map((k) => {
    const a = p[(k + 1) % 3]!.clone().sub(p[k]!).normalize();
    const b = p[(k + 2) % 3]!.clone().sub(p[k]!).normalize();
    return (Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180) / Math.PI;
  });
  const n = new Vector3().crossVectors(p[1]!.clone().sub(p[0]!), p[2]!.clone().sub(p[0]!));
  const area = n.length() / 2;
  n.normalize();
  const lens = [0, 1, 2].map((k) => (100 * p[k]!.distanceTo(p[(k + 1) % 3]!)).toFixed(2));
  return `face ${f}: v ${t.join(',')} corners ${ang.map((a) => a.toFixed(1)).join('/')} edges cm ${lens.join('/')} area ${(area * 1e4).toFixed(3)} cm2 n ${n.toArray().map((x) => x.toFixed(2)).join(',')}`;
};
const set = new Set(ids);
console.log('Faces with a corner in the list:');
for (let f = 0; f < nf; f++) {
  const t = [0, 1, 2].map((k) => weld[sm.corners[f * 3 + k]!]!);
  if (t.some((v) => set.has(v))) console.log(info(f));
}
console.log(`Thin faces (corner under ${thin} deg) within ${reach} m:`);
for (let f = 0; f < nf; f++) {
  const t = [0, 1, 2].map((k) => weld[sm.corners[f * 3 + k]!]!);
  const near = t.some((v) => ids.some((u) => P(v).distanceTo(P(u)) < reach));
  if (!near) continue;
  const s = info(f);
  const min = Math.min(...s.split('corners ')[1]!.split(' ')[0]!.split('/').map(Number));
  if (min < thin) console.log(s);
}
for (const v of ids) console.log(`v${v} at ${P(v).toArray().map((x) => x.toFixed(4)).join(',')}`);
