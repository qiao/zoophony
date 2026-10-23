/**
 * Lists the edges of the arm region of the timpanist whose fold angle changes most from the source
 * mesh: the creases of `pnpm arm-look`, for each set of samples. Each line gives the faces of the
 * edge, the middle of the edge in the source units, the share of the samples with a change of more
 * than 40°, and the largest change. Usage:
 *
 *     node docs/research/2026-10-22-elephant-apose/crease-edges.ts [<set>,...]
 */
import { Vector3 } from 'three';

import { CREASE_ANGLE, armRegion, sourceCorners } from '../../../tools/arm-look.ts';
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import type { StudioRig } from '../../../src/models/studio-rig.ts';

const sets = (process.argv[2] ?? 'rest,play').split(',');
const source = FOLD_ROLES.get('timpanist');
if (!source) {
  throw new Error('No timpanist.');
}
const sources = await sourceCorners('elephant');
const demos = await probeDemos();
const normal = (p: ArrayLike<number>, c: Uint32Array, f: number): Vector3 => {
  const [a, b, d] = [0, 1, 2].map((k) => new Vector3().fromArray(p, (c[f * 3 + k] ?? 0) * 3));
  return new Vector3()
    .subVectors(b ?? new Vector3(), a ?? new Vector3())
    .cross(new Vector3().subVectors(d ?? new Vector3(), a ?? new Vector3()))
    .normalize();
};
const sourceNormal = (f: number): Vector3 => {
  const s = sources[f];
  if (!s) {
    return new Vector3();
  }
  const [a, b, c] = s.s.map((p) => new Vector3(...p));
  return new Vector3()
    .subVectors(b ?? new Vector3(), a ?? new Vector3())
    .cross(new Vector3().subVectors(c ?? new Vector3(), a ?? new Vector3()))
    .normalize();
};
const deg = (a: Vector3, b: Vector3): number =>
  (Math.acos(Math.min(1, Math.max(-1, a.dot(b)))) * 180) / Math.PI;

for (const set of sets) {
  const stats = new Map<string, { over: number; most: number; n: number }>();
  let rig0: StudioRig | null = null;
  probeFolds(
    source,
    demos,
    1,
    (rig, _studio, posed) => {
      rig0 = rig;
      for (const side of ['L', 'R'] as const) {
        const region = armRegion(rig, side, sources);
        for (const [k, [i, j]] of region.edges.entries()) {
          const fi = region.faces[i] ?? 0;
          const fj = region.faces[j] ?? 0;
          const was = region.sourceAngles[k] ?? Number.NaN;
          if (Number.isNaN(was)) {
            continue;
          }
          const now = deg(normal(posed, rig.mesh.corners, fi), normal(posed, rig.mesh.corners, fj));
          const key = `${side} ${fi}-${fj}`;
          const s = stats.get(key) ?? { over: 0, most: 0, n: 0 };
          s.n += 1;
          s.most = Math.max(s.most, Math.abs(now - was));
          if (Math.abs(now - was) > CREASE_ANGLE) {
            s.over += 1;
          }
          stats.set(key, s);
        }
      }
    },
    [set as 'rest' | 'play' | 'lift'],
  );
  console.log(`set ${set}: the 25 edges with the largest change of the fold angle`);
  const rows = [...stats.entries()].sort((a, b) => b[1].over - a[1].over || b[1].most - a[1].most);
  for (const [key, s] of rows.slice(0, 25)) {
    const [, pair = ''] = key.split(' ');
    const [fi = 0, fj = 0] = pair.split('-').map(Number);
    const mids = [fi, fj].map((f) => {
      const c = sources[f]?.s ?? [];
      const m = c.reduce((acc, p) => acc.add(new Vector3(...p)), new Vector3());
      return m.divideScalar(Math.max(1, c.length));
    });
    const mid = (mids[0] ?? new Vector3()).add(mids[1] ?? new Vector3()).multiplyScalar(0.5);
    console.log(
      `  ${key}: middle ${mid.toArray().map((x) => x.toFixed(3)).join(', ')}, over 40° in ${((100 * s.over) / s.n).toFixed(1)}% of ${s.n}, most ${s.most.toFixed(0)}°, source normals ${sourceNormal(fi).toArray().map((x) => x.toFixed(2)).join(' ')}`,
    );
  }
  void rig0;
}
