/**
 * Prints the body of the pianist of the Bach demo at rest (the report `2026-10-13-pianist-lap.md`,
 * section 4): the joints, the lengths of the left upper arm and forearm, the front and the back z
 * of the trunk and the legs at each height and x (the front is the most negative z), and the top
 * of the lap at each x and z, as `lapPoint()` finds it. Run from the repository root:
 * `node docs/research/2026-10-13-pianist-lap/profile-body.ts [--set <changes>]`.
 */
import { Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { posedPart } from '../../../src/pose/test-clearance.ts';
import { posedAt } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, firstPlayers, sceneOf } from '../../../src/pose/test-scene.ts';
const args = process.argv.slice(2);
const setAt = args.indexOf('--set');
if (setAt >= 0) setHolds(args[setAt + 1] ?? '');
const demo = (await patchedDemos()).find((d) => d.file.startsWith('bach'))!;
const scene = sceneOf(demo.bytes);
const [piano] = firstPlayers(scene, ['piano'] as const);
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const posed = posedAt(scene, piano!, start, 10, NOT_STARTED);
const at = (b: BoneName) => posed.frames[boneIndex(b)]!.position;
for (const b of ['hips', 'spine', 'chest', 'neck', 'head', 'upperArmL', 'forearmL', 'handL', 'thighL', 'shinL', 'footL'] as const) {
  const p = at(b);
  console.log(b.padEnd(10), p.x.toFixed(3), p.y.toFixed(3), p.z.toFixed(3));
}
console.log('upper arm', at('upperArmL').distanceTo(at('forearmL')).toFixed(3), 'forearm', at('forearmL').distanceTo(at('handL')).toFixed(3));
const bones = ['hips', 'spine', 'chest', 'neck', 'thighL', 'thighR', 'shinL', 'shinR'] as const;
const part = posedPart(posed, bones);
// For each x slice, intersect the triangles with the plane x = c, and keep the segments.
const xs = [0, -0.1, -0.2, -0.28, -0.35];
const ys: number[] = [];
for (let y = 0.3; y <= 1.3; y += 0.05) ys.push(y);
console.log('front z (min) and back z (max) of the body at x and y; "-" when no skin');
console.log('y     ' + xs.map((x) => `x=${x}`.padEnd(14)).join(''));
for (const y of ys.toReversed()) {
  const cells = xs.map((x) => {
    let lo = Infinity, hi = -Infinity;
    for (const t of part.triangles) {
      const pts = [t.a, t.b, t.c];
      // Intersect the triangle with the line x = x, y = y (along z).
      const e1 = new Vector3().subVectors(pts[1]!, pts[0]!);
      const e2 = new Vector3().subVectors(pts[2]!, pts[0]!);
      // Solve a + u e1 + v e2 = (x, y, z) for u, v in the x-y plane.
      const det = e1.x * e2.y - e1.y * e2.x;
      if (Math.abs(det) < 1e-12) continue;
      const px = x - pts[0]!.x, py = y - pts[0]!.y;
      const u = (px * e2.y - py * e2.x) / det;
      const v = (e1.x * py - e1.y * px) / det;
      if (u < 0 || v < 0 || u + v > 1) continue;
      const z = pts[0]!.z + u * e1.z + v * e2.z;
      lo = Math.min(lo, z); hi = Math.max(hi, z);
    }
    return lo === Infinity ? '-'.padEnd(14) : `${lo.toFixed(2)}..${hi.toFixed(2)}`.padEnd(14);
  });
  console.log(y.toFixed(2).padEnd(6) + cells.join(''));
}
// The top of the body at z, for x slices: highest y along vertical lines.
console.log('top y of the lap (hips, spine, thighs, shins) at x (rows) and z (columns)');
const zs = [-0.1, -0.2, -0.3, -0.4, -0.5, -0.6];
const lap = posedPart(posed, ['hips', 'spine', 'thighL', 'thighR', 'shinL', 'shinR']);
console.log('x \\ z  ' + zs.map((z) => String(z).padEnd(8)).join(''));
for (const x of xs) {
  const cells = zs.map((z) => {
    let top = -Infinity;
    for (const t of lap.triangles) {
      const [a, b, c] = [t.a, t.b, t.c];
      const area = (b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z);
      if (Math.abs(area) < 1e-12) continue;
      const wb = ((x - a.x) * (c.z - a.z) - (c.x - a.x) * (z - a.z)) / area;
      const wc = ((b.x - a.x) * (z - a.z) - (x - a.x) * (b.z - a.z)) / area;
      const wa = 1 - wb - wc;
      if (wa >= 0 && wb >= 0 && wc >= 0) top = Math.max(top, wa * a.y + wb * b.y + wc * c.y);
    }
    return (top === -Infinity ? '-' : top.toFixed(2)).padEnd(8);
  });
  console.log(String(x).padEnd(7) + cells.join(''));
}
