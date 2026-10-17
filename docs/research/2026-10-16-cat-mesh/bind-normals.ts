/**
 * Lists the faces of the bind mesh of the cat and of the fox whose normal opposes the normals of
 * their neighbors (a mean dot below -0.2), with their areas. Usage:
 *
 *     node docs/research/2026-10-16-cat-mesh/bind-normals.ts
 */
import { STUDIO_CAT } from '../../../src/models/studio/cat.ts';
import { STUDIO_FOX } from '../../../src/models/studio/fox.ts';
import { unpackStudioMesh } from '../../../src/models/studio-format.ts';
import type { StudioBody } from '../../../src/models/studio-format.ts';

for (const [name, body] of [['cat', STUDIO_CAT], ['fox', STUDIO_FOX]] as [string, StudioBody][]) {
  const m = unpackStudioMesh(body.mesh);
  const p = m.positions;
  const faces = m.corners.length / 3;
  const nrm = new Float64Array(faces * 3);
  const area = new Float64Array(faces);
  for (let f = 0; f < faces; f++) {
    const [a, b, c] = [0, 1, 2].map((k) => (m.corners[f * 3 + k] ?? 0) * 3) as [number, number, number];
    const u = [0, 1, 2].map((i) => p[b + i]! - p[a + i]!);
    const v = [0, 1, 2].map((i) => p[c + i]! - p[a + i]!);
    const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
    const l = Math.hypot(...n);
    area[f] = l / 2;
    for (let i = 0; i < 3; i++) nrm[f * 3 + i] = l > 0 ? n[i]! / l : 0;
  }
  // Neighbors by shared edges (by vertex index).
  const edges = new Map<string, number[]>();
  for (let f = 0; f < faces; f++) {
    for (let k = 0; k < 3; k++) {
      const a = m.corners[f * 3 + k]!;
      const b = m.corners[f * 3 + ((k + 1) % 3)]!;
      const key = a < b ? `${a} ${b}` : `${b} ${a}`;
      edges.set(key, [...(edges.get(key) ?? []), f]);
    }
  }
  const bad: string[] = [];
  for (let f = 0; f < faces; f++) {
    let dots = 0;
    let count = 0;
    let worst = 1;
    for (let k = 0; k < 3; k++) {
      const a = m.corners[f * 3 + k]!;
      const b = m.corners[f * 3 + ((k + 1) % 3)]!;
      for (const g of edges.get(a < b ? `${a} ${b}` : `${b} ${a}`) ?? []) {
        if (g === f) continue;
        const d = nrm[f * 3]! * nrm[g * 3]! + nrm[f * 3 + 1]! * nrm[g * 3 + 1]! + nrm[f * 3 + 2]! * nrm[g * 3 + 2]!;
        dots += d;
        count++;
        worst = Math.min(worst, d);
      }
    }
    if (count && dots / count < -0.2) bad.push(`${f} (mean dot ${(dots / count).toFixed(2)}, area ${(area[f]! * 1e4).toFixed(2)} cm2)`);
  }
  console.log(`${name}: ${faces} faces, ${bad.length} faces whose normal opposes their neighbors in the bind: ${bad.slice(0, 30).join(', ')}`);
}
