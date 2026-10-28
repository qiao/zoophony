/**
 * Lists the sharp edges of the bind mesh of the polar bear near each wrist: the edges whose two
 * faces meet at more than `--angle` degrees, with the place of the edge middle along the arm (t,
 * in mm from the wrist joint: negative on the forearm, positive on the paw), its clock angle
 * around the arm (0 on the top of the paw in the bind, 90 toward the thumb side), whether it is
 * concave, and the weights of its vertices.
 *
 * Usage: node scratch/bindedges.ts [--angle <deg>] [--side L|R] [--back <m>] [--ahead <m>]
 */
import { Vector3 } from 'three';

import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { studioNormals } from '../src/models/studio-normals.ts';
import { roleBodies } from '../tools/fold-probe.ts';
import { demoSceneOf } from '../src/pose/test-scene.ts';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string =>
  args.includes(name) ? args[args.indexOf(name) + 1]! : fallback;
const limit = Number(opt('--angle', '30'));
const side = opt('--side', 'L');
const back = Number(opt('--back', '0.05'));
const ahead = Number(opt('--ahead', '0.03'));
const scene = await demoSceneOf('boulanger-matin.mid');
const [body] = roleBodies({ kind: 'player', instrument: 'piano', species: ['polar-bear'] }, scene);
const rig = body!.model.studio!;
const mesh = rig.mesh;
const P = mesh.positions;
const C = mesh.corners;
const H = rig.body.heads as unknown as Record<string, readonly [number, number, number]>;
const e0 = new Vector3(...H[`forearm_${side}`]!);
const w0 = new Vector3(...H[`hand_${side}`]!);
const t0 = new Vector3(...H[`fingers_${side}`]!);
const fd = w0.clone().sub(e0).normalize();
const hd = t0.clone().sub(w0).normalize();
const axis = fd.clone().add(hd).normalize();
// The bend normal and the inner direction of the bend (toward the paw turn).
const bendN = fd.clone().cross(hd).normalize();
const inner = bendN.clone().cross(axis).normalize();
const palm = new Vector3(...(rig.body.palms as Record<string, readonly [number, number, number]>)[side]!);
const v3 = (i: number): Vector3 => new Vector3(P[i * 3]!, P[i * 3 + 1]!, P[i * 3 + 2]!);
const place = (p: Vector3): [number, number, number] => {
  const q = p.clone().sub(w0);
  const t = q.dot(q.dot(fd) < 0 ? fd : hd);
  const r = q.clone().sub(axis.clone().multiplyScalar(q.dot(axis)));
  // Clock: 0 toward the back of the paw (the side away from the palm), 90 toward the inner bend.
  const up = palm.clone().negate().sub(axis.clone().multiplyScalar(-palm.dot(axis))).normalize();
  const side2 = axis.clone().cross(up);
  const clock = (Math.atan2(r.dot(side2), r.dot(up)) * 180) / Math.PI;
  return [t * 1000, clock, r.length() * 1000];
};
const names = (v: number): string => {
  const out: string[] = [];
  for (let k = 0; k < 4; k++) {
    const w = mesh.weights[v * 4 + k]!;
    if (w > 0.01) out.push(`${STUDIO_BONES[mesh.joints[v * 4 + k]!]!.replace(`_${side}`, '')} ${w.toFixed(2)}`);
  }
  return out.join(', ');
};
console.log(`side ${side}: inner bend dir ${inner.toArray().map((x) => x.toFixed(2))}, palm ${palm.toArray().map((x) => x.toFixed(2))}, wrist turn in the bind ${((Math.acos(fd.dot(hd)) * 180) / Math.PI).toFixed(1)} deg`);
console.log(`clock of the inner bend: ${place(w0.clone().add(inner.clone().multiplyScalar(0.03)))[1].toFixed(0)}`);
const normals = studioNormals(mesh, rig.body.crease, rig.body.caps, rig.body.rim);
const map = new Map<string, [number, number]>();
const rows: string[] = [];
const inside = (v: number): boolean => {
  const q = v3(v).sub(w0);
  return q.dot(fd) > -back && q.dot(hd) < ahead && q.length() < 0.12;
};
for (let f = 0; f < C.length / 3; f++) {
  for (let k = 0; k < 3; k++) {
    const a = C[f * 3 + k]!;
    const b = C[f * 3 + ((k + 1) % 3)]!;
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, [f, k]);
      continue;
    }
    if (!inside(a) || !inside(b)) continue;
    const [f1] = prev;
    const fn = (ff: number): Vector3 => {
      const [x, y, z] = [0, 1, 2].map((j) => v3(C[ff * 3 + j]!));
      return y!.clone().sub(x!).cross(z!.clone().sub(x!)).normalize();
    };
    const n1 = fn(f1);
    const n2 = fn(f);
    const angle = (Math.acos(Math.max(-1, Math.min(1, n1.dot(n2)))) * 180) / Math.PI;
    if (angle < limit) continue;
    const o2 = [0, 1, 2].map((j) => C[f * 3 + j]!).find((v) => v !== a && v !== b)!;
    const concave = v3(o2).sub(v3(a)).dot(n1) > 0;
    // The corner normals of both faces at a: a split shows as a jump.
    const corner = (ff: number, v: number): Vector3 => {
      const j = [0, 1, 2].find((jj) => C[ff * 3 + jj] === v)!;
      const c = ff * 3 + j;
      return new Vector3(normals[c * 3]!, normals[c * 3 + 1]!, normals[c * 3 + 2]!);
    };
    const jump = (Math.acos(Math.max(-1, Math.min(1, corner(f1, a).dot(corner(f, a))))) * 180) / Math.PI;
    const mid = v3(a).add(v3(b)).multiplyScalar(0.5);
    const [t, clock, r] = place(mid);
    const len = v3(a).distanceTo(v3(b)) * 1000;
    rows.push(
      `| ${a}-${b} | ${f1}, ${f} | ${angle.toFixed(0)} | ${concave ? 'concave' : 'convex'} | ${jump.toFixed(0)} | ${t.toFixed(0)} | ${clock.toFixed(0)} | ${r.toFixed(0)} | ${len.toFixed(0)} | ${names(a)} / ${names(b)} |`,
    );
  }
}
console.log('| Edge | Faces | Bind angle | Kind | Normal jump | t mm | clock | r mm | length mm | weights a / b |');
console.log('|---|---|---:|---|---:|---:|---:|---:|---:|---|');
for (const r of rows) console.log(r);
